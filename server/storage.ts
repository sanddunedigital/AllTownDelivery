import { 
  type User, type InsertUser, type DeliveryRequest, type InsertDeliveryRequest,
  type UserProfile, type InsertUserProfile, type UpdateUserProfile,
  type ClaimDelivery, type UpdateDeliveryStatus,
  type Business, type InsertBusiness,
  users, deliveryRequests, userProfiles, businesses 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Legacy user methods (for backward compatibility)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User profile methods (for Supabase Auth integration)
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: string, updates: UpdateUserProfile): Promise<UserProfile>;
  updateLoyaltyPoints(userId: string, points: number, wasFreeDelivery?: boolean): Promise<void>;
  checkLoyaltyEligibility(userId: string): Promise<boolean>;
  
  // Delivery request methods
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;
  getDeliveryRequests(userId?: string): Promise<DeliveryRequest[]>;
  updateDeliveryStatus(id: string, status: string): Promise<void>;
  
  // Driver methods
  getAvailableDeliveries(): Promise<DeliveryRequest[]>;
  getDriverDeliveries(driverId: string): Promise<DeliveryRequest[]>;
  claimDelivery(driverId: string, deliveryId: string, notes?: string): Promise<DeliveryRequest>;
  updateDeliveryForDriver(driverId: string, deliveryId: string, updates: Partial<UpdateDeliveryStatus>): Promise<DeliveryRequest>;
  
  // Business methods
  getBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<string, UserProfile>;
  private deliveryRequests: Map<string, DeliveryRequest>;
  private businesses: Map<string, Business>;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.deliveryRequests = new Map();
    this.businesses = new Map();
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // User profile methods
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(id);
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const profile: UserProfile = {
      ...insertProfile,
      fullName: insertProfile.fullName || null,
      phone: insertProfile.phone || null,
      defaultPickupAddress: insertProfile.defaultPickupAddress || null,
      defaultDeliveryAddress: insertProfile.defaultDeliveryAddress || null,
      preferredPaymentMethod: insertProfile.preferredPaymentMethod || null,
      loyaltyPoints: 0,
      totalDeliveries: 0,
      freeDeliveryCredits: 0,
      marketingConsent: insertProfile.marketingConsent || false,
      role: insertProfile.role || "customer",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userProfiles.set(profile.id, profile);
    return profile;
  }

  async updateUserProfile(id: string, updates: UpdateUserProfile): Promise<UserProfile> {
    const existing = this.userProfiles.get(id);
    if (!existing) {
      throw new Error("User profile not found");
    }
    const updated: UserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.userProfiles.set(id, updated);
    return updated;
  }

  async updateLoyaltyPoints(userId: string, points: number, wasFreeDelivery: boolean = false): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      if (wasFreeDelivery) {
        // If this was a free delivery, don't change loyalty points, decrement free credits
        // Keep current loyalty points - free deliveries don't reset progress
        profile.freeDeliveryCredits = Math.max(0, (profile.freeDeliveryCredits || 0) - 1); // Use one free credit
        profile.totalDeliveries = (profile.totalDeliveries || 0) + 1;
      } else {
        // Regular paid delivery
        profile.loyaltyPoints = (profile.loyaltyPoints || 0) + points;
        profile.totalDeliveries = (profile.totalDeliveries || 0) + 1;
        
        // If loyalty points reach 10, award 1 free credit and reset points to 0
        if (profile.loyaltyPoints >= 10) {
          profile.freeDeliveryCredits = (profile.freeDeliveryCredits || 0) + 1;
          profile.loyaltyPoints = 0; // Reset points after earning free credit
        }
      }
      
      profile.updatedAt = new Date();
      this.userProfiles.set(userId, profile);
    }
  }

  async checkLoyaltyEligibility(userId: string): Promise<boolean> {
    const profile = this.userProfiles.get(userId);
    return (profile?.freeDeliveryCredits || 0) > 0;
  }

  // Delivery request methods
  async createDeliveryRequest(insertRequest: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const id = randomUUID();
    const request: DeliveryRequest = { 
      ...insertRequest,
      userId: insertRequest.userId || null,
      businessId: insertRequest.businessId || null,
      specialInstructions: insertRequest.specialInstructions || null,
      marketingConsent: null,
      status: "available",
      usedFreeDelivery: insertRequest.usedFreeDelivery ?? false,
      claimedByDriver: null,
      claimedAt: null,
      driverNotes: null,
      id,
      createdAt: new Date()
    };
    this.deliveryRequests.set(id, request);
    return request;
  }

  async getDeliveryRequests(userId?: string): Promise<DeliveryRequest[]> {
    const requests = Array.from(this.deliveryRequests.values());
    return userId ? requests.filter(r => r.userId === userId) : requests;
  }

  async updateDeliveryStatus(id: string, status: string): Promise<void> {
    const request = this.deliveryRequests.get(id);
    if (request) {
      const updated = { ...request, status };
      this.deliveryRequests.set(id, updated);
    }
  }

  // Driver methods
  async getAvailableDeliveries(): Promise<DeliveryRequest[]> {
    return Array.from(this.deliveryRequests.values()).filter(r => r.status === 'available');
  }

  async getDriverDeliveries(driverId: string): Promise<DeliveryRequest[]> {
    return Array.from(this.deliveryRequests.values()).filter(r => r.claimedByDriver === driverId);
  }

  async claimDelivery(driverId: string, deliveryId: string, notes?: string): Promise<DeliveryRequest> {
    const request = this.deliveryRequests.get(deliveryId);
    if (!request) {
      throw new Error("Delivery request not found");
    }
    if (request.status !== 'available') {
      throw new Error("Delivery is not available for claiming");
    }
    
    const updated: DeliveryRequest = {
      ...request,
      status: 'claimed',
      claimedByDriver: driverId,
      claimedAt: new Date(),
      driverNotes: notes || null
    };
    this.deliveryRequests.set(deliveryId, updated);
    return updated;
  }

  async updateDeliveryForDriver(driverId: string, deliveryId: string, updates: Partial<UpdateDeliveryStatus>): Promise<DeliveryRequest> {
    const request = this.deliveryRequests.get(deliveryId);
    if (!request) {
      throw new Error("Delivery request not found");
    }
    if (request.claimedByDriver !== driverId) {
      throw new Error("Delivery is not claimed by this driver");
    }
    
    const updated: DeliveryRequest = {
      ...request,
      ...updates,
      driverNotes: updates.driverNotes || request.driverNotes
    };
    this.deliveryRequests.set(deliveryId, updated);
    return updated;
  }

  // Business methods
  async getBusinesses(): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(b => b.isActive);
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = randomUUID();
    const business: Business = {
      ...insertBusiness,
      id,
      website: insertBusiness.website || null,
      category: insertBusiness.category || null,
      isActive: insertBusiness.isActive ?? true,
      createdAt: new Date()
    };
    this.businesses.set(id, business);
    return business;
  }
}

export class DatabaseStorage implements IStorage {
  private async testConnection(): Promise<boolean> {
    return true; // Temporarily disable connection test to force database usage
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // User profile methods
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1);
    return result[0];
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(userProfiles).values(insertProfile).returning();
    return result[0];
  }

  async updateUserProfile(id: string, updates: UpdateUserProfile): Promise<UserProfile> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User profile not found");
    }
    return result[0];
  }

  async updateLoyaltyPoints(userId: string, points: number, wasFreeDelivery: boolean = false): Promise<void> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    let newLoyaltyPoints: number;
    let newFreeCredits: number;
    let newTotalDeliveries: number;

    if (wasFreeDelivery) {
      // If this was a free delivery, don't change loyalty points, decrement free credits
      newLoyaltyPoints = profile.loyaltyPoints || 0; // Keep current loyalty points
      newFreeCredits = Math.max(0, (profile.freeDeliveryCredits || 0) - 1); // Use one free credit
      newTotalDeliveries = (profile.totalDeliveries || 0) + 1;
    } else {
      // Regular paid delivery
      newLoyaltyPoints = (profile.loyaltyPoints || 0) + points;
      newTotalDeliveries = (profile.totalDeliveries || 0) + 1;
      
      // If loyalty points reach 10, award 1 free credit and reset points to 0
      if (newLoyaltyPoints >= 10) {
        newFreeCredits = (profile.freeDeliveryCredits || 0) + 1;
        newLoyaltyPoints = 0; // Reset points after earning free credit
      } else {
        newFreeCredits = profile.freeDeliveryCredits || 0;
      }
    }

    await db
      .update(userProfiles)
      .set({
        loyaltyPoints: newLoyaltyPoints,
        totalDeliveries: newTotalDeliveries,
        freeDeliveryCredits: newFreeCredits,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.id, userId));
  }

  async checkLoyaltyEligibility(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    return (profile?.freeDeliveryCredits || 0) > 0;
  }

  // Delivery request methods
  async createDeliveryRequest(insertRequest: InsertDeliveryRequest): Promise<DeliveryRequest> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const requestWithDefaults = {
      ...insertRequest,
      status: "available", // New requests are immediately available for drivers
      usedFreeDelivery: insertRequest.usedFreeDelivery ?? false,
      marketingConsent: null,
      claimedByDriver: null,
      claimedAt: null,
      driverNotes: null
    };
    const result = await db.insert(deliveryRequests).values(requestWithDefaults).returning();
    return result[0];
  }

  async getDeliveryRequests(userId?: string): Promise<DeliveryRequest[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    if (userId) {
      return await db.select().from(deliveryRequests).where(eq(deliveryRequests.userId, userId));
    }
    return await db.select().from(deliveryRequests);
  }

  async updateDeliveryStatus(id: string, status: string): Promise<void> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    await db
      .update(deliveryRequests)
      .set({ status })
      .where(eq(deliveryRequests.id, id));
  }

  // Driver methods
  async getAvailableDeliveries(): Promise<DeliveryRequest[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    console.log("Executing getAvailableDeliveries query...");
    try {
      const result = await db.select().from(deliveryRequests).where(eq(deliveryRequests.status, 'available'));
      console.log("Query executed successfully, found:", result.length, "deliveries");
      return result;
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  async getDriverDeliveries(driverId: string): Promise<DeliveryRequest[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    return await db.select().from(deliveryRequests).where(eq(deliveryRequests.claimedByDriver, driverId));
  }

  async claimDelivery(driverId: string, deliveryId: string, notes?: string): Promise<DeliveryRequest> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    const result = await db
      .update(deliveryRequests)
      .set({
        status: 'claimed',
        claimedByDriver: driverId,
        claimedAt: new Date(),
        driverNotes: notes || null
      })
      .where(eq(deliveryRequests.id, deliveryId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Delivery request not found or already claimed");
    }
    return result[0];
  }

  async updateDeliveryForDriver(driverId: string, deliveryId: string, updates: Partial<UpdateDeliveryStatus>): Promise<DeliveryRequest> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    const result = await db
      .update(deliveryRequests)
      .set(updates)
      .where(eq(deliveryRequests.id, deliveryId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Delivery request not found");
    }
    return result[0];
  }

  // Business methods
  async getBusinesses(): Promise<Business[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    return await db.select().from(businesses).where(eq(businesses.isActive, true));
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(businesses).values(insertBusiness).returning();
    return result[0];
  }
}

// Smart storage selection - try database first, fallback to memory
class SmartStorage implements IStorage {
  private memStorage = new MemStorage();
  private dbStorage = new DatabaseStorage();
  
  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      return await this.dbStorage.getUser(id);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getUser(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      return await this.dbStorage.getUserByUsername(username);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getUserByUsername(username);
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      return await this.dbStorage.createUser(user);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createUser(user);
    }
  }

  // User profile methods
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    try {
      return await this.dbStorage.getUserProfile(id);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getUserProfile(id);
    }
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    try {
      return await this.dbStorage.createUserProfile(profile);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createUserProfile(profile);
    }
  }

  async updateUserProfile(id: string, updates: UpdateUserProfile): Promise<UserProfile> {
    try {
      return await this.dbStorage.updateUserProfile(id, updates);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.updateUserProfile(id, updates);
    }
  }

  async updateLoyaltyPoints(userId: string, points: number, wasFreeDelivery: boolean = false): Promise<void> {
    try {
      await this.dbStorage.updateLoyaltyPoints(userId, points, wasFreeDelivery);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.updateLoyaltyPoints(userId, points, wasFreeDelivery);
    }
  }

  async checkLoyaltyEligibility(userId: string): Promise<boolean> {
    try {
      return await this.dbStorage.checkLoyaltyEligibility(userId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.checkLoyaltyEligibility(userId);
    }
  }

  // Delivery request methods
  async createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest> {
    try {
      return await this.dbStorage.createDeliveryRequest(request);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createDeliveryRequest(request);
    }
  }

  async getDeliveryRequests(userId?: string): Promise<DeliveryRequest[]> {
    try {
      return await this.dbStorage.getDeliveryRequests(userId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getDeliveryRequests(userId);
    }
  }

  async updateDeliveryStatus(id: string, status: string): Promise<void> {
    try {
      await this.dbStorage.updateDeliveryStatus(id, status);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.updateDeliveryStatus(id, status);
    }
  }

  // Driver methods
  async getAvailableDeliveries(): Promise<DeliveryRequest[]> {
    try {
      const result = await this.dbStorage.getAvailableDeliveries();
      console.log("Database query successful - found deliveries:", result.length);
      return result;
    } catch (error) {
      console.error("Database error in getAvailableDeliveries:", error);
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getAvailableDeliveries();
    }
  }

  async getDriverDeliveries(driverId: string): Promise<DeliveryRequest[]> {
    try {
      return await this.dbStorage.getDriverDeliveries(driverId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getDriverDeliveries(driverId);
    }
  }

  async claimDelivery(driverId: string, deliveryId: string, notes?: string): Promise<DeliveryRequest> {
    try {
      return await this.dbStorage.claimDelivery(driverId, deliveryId, notes);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.claimDelivery(driverId, deliveryId, notes);
    }
  }

  async updateDeliveryForDriver(driverId: string, deliveryId: string, updates: Partial<UpdateDeliveryStatus>): Promise<DeliveryRequest> {
    try {
      return await this.dbStorage.updateDeliveryForDriver(driverId, deliveryId, updates);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.updateDeliveryForDriver(driverId, deliveryId, updates);
    }
  }

  // Business methods
  async getBusinesses(): Promise<Business[]> {
    try {
      return await this.dbStorage.getBusinesses();
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getBusinesses();
    }
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    try {
      return await this.dbStorage.createBusiness(business);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createBusiness(business);
    }
  }
}

export const storage = new SmartStorage();
