import { 
  type User, type InsertUser, type DeliveryRequest, type InsertDeliveryRequest,
  type UserProfile, type InsertUserProfile, type UpdateUserProfile,
  type ClaimDelivery, type UpdateDeliveryStatus,
  type Business, type InsertBusiness,
  users, deliveryRequests, userProfiles, businesses, businessSettings, serviceZones 
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
  getDrivers(): Promise<UserProfile[]>; // Get all users who can be drivers (drivers, dispatchers, admins)
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
  releaseDriverDeliveries(driverId: string): Promise<void>;
  
  // Business methods
  getBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  
  // Business settings methods
  getBusinessSettings(tenantId: string): Promise<any>;
  updateBusinessSettings(tenantId: string, settings: any): Promise<any>;
  
  // Service zones methods  
  getServiceZones(tenantId: string): Promise<any[]>;
  createServiceZone(zone: any): Promise<any>;
  updateServiceZone(id: string, updates: any): Promise<any>;
  deleteServiceZone(id: string): Promise<void>;
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

  async getDrivers(): Promise<UserProfile[]> {
    return Array.from(this.userProfiles.values()).filter(
      profile => profile.role === 'driver' || profile.role === 'dispatcher' || profile.role === 'admin'
    );
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const profile: UserProfile = {
      ...insertProfile,
      tenantId: insertProfile.tenantId || "00000000-0000-0000-0000-000000000001",
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
      isOnDuty: insertProfile.isOnDuty || null,
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
      tenantId: insertRequest.tenantId || "00000000-0000-0000-0000-000000000001",
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

  async releaseDriverDeliveries(driverId: string): Promise<void> {
    // Find all claimed deliveries for this driver
    const driverDeliveries = Array.from(this.deliveryRequests.values()).filter(
      d => d.claimedByDriver === driverId && d.status === 'claimed'
    );
    
    if (driverDeliveries.length > 0) {
      console.log(`Releasing ${driverDeliveries.length} claimed deliveries for driver ${driverId}`);
      
      // Release claimed deliveries back to available
      driverDeliveries.forEach(delivery => {
        const updated: DeliveryRequest = {
          ...delivery,
          status: 'available',
          claimedByDriver: null,
          claimedAt: null,
          driverNotes: null
        };
        this.deliveryRequests.set(delivery.id, updated);
      });
    }
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
      tenantId: insertBusiness.tenantId || "00000000-0000-0000-0000-000000000001",
      website: insertBusiness.website || null,
      category: insertBusiness.category || null,
      isActive: insertBusiness.isActive ?? true,
      createdAt: new Date()
    };
    this.businesses.set(id, business);
    return business;
  }

  // Business settings methods (memory storage - stubbed)
  async getBusinessSettings(tenantId: string): Promise<any> {
    return null; // Memory storage doesn't support business settings
  }

  async updateBusinessSettings(tenantId: string, settings: any): Promise<any> {
    return settings; // Memory storage doesn't persist business settings
  }

  // Service zones methods (memory storage - stubbed)  
  async getServiceZones(tenantId: string): Promise<any[]> {
    return []; // Memory storage doesn't support service zones
  }

  async createServiceZone(zone: any): Promise<any> {
    return zone; // Memory storage doesn't persist service zones
  }

  async updateServiceZone(id: string, updates: any): Promise<any> {
    return updates; // Memory storage doesn't persist service zones
  }

  async deleteServiceZone(id: string): Promise<void> {
    // Memory storage doesn't persist service zones
  }
}

export class DatabaseStorage implements IStorage {
  private async testConnection(): Promise<boolean> {
    try {
      // Test the database connection with a simple query
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
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

  async getDrivers(): Promise<UserProfile[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(userProfiles)
      .where(sql`${userProfiles.role} IN ('driver', 'dispatcher', 'admin')`);
    return result;
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

  async releaseDriverDeliveries(driverId: string): Promise<void> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    // Find all claimed deliveries for this driver
    const driverDeliveries = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.claimedByDriver, driverId));
    
    // Filter only claimed deliveries (not in_progress or completed)
    const claimedDeliveries = driverDeliveries.filter(d => d.status === 'claimed');
    
    if (claimedDeliveries.length > 0) {
      console.log(`Releasing ${claimedDeliveries.length} claimed deliveries for driver ${driverId}`);
      
      // Release claimed deliveries back to available
      await db
        .update(deliveryRequests)
        .set({
          status: 'available',
          claimedByDriver: null,
          claimedAt: null,
          driverNotes: null
        })
        .where(eq(deliveryRequests.claimedByDriver, driverId));
    }
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

  // Business settings methods
  async getBusinessSettings(tenantId: string): Promise<any> {
    const result = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));
    return result[0] || null;
  }

  async updateBusinessSettings(tenantId: string, settings: any): Promise<any> {
    // Check if settings exist for this tenant
    const existing = await this.getBusinessSettings(tenantId);
    
    // Clean the settings object and ensure proper Date handling
    const cleanSettings = { ...settings };
    delete cleanSettings.id;
    delete cleanSettings.tenantId;
    delete cleanSettings.createdAt;
    delete cleanSettings.updatedAt;
    
    if (existing) {
      // Update existing settings
      const result = await db
        .update(businessSettings)
        .set({ ...cleanSettings, updatedAt: new Date() })
        .where(eq(businessSettings.tenantId, tenantId))
        .returning();
      return result[0];
    } else {
      // Create new settings
      const result = await db
        .insert(businessSettings)
        .values({ ...cleanSettings, tenantId, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return result[0];
    }
  }

  // Service zones methods
  async getServiceZones(tenantId: string): Promise<any[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    return await db.select().from(serviceZones).where(eq(serviceZones.tenantId, tenantId));
  }

  async createServiceZone(zone: any): Promise<any> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(serviceZones).values(zone).returning();
    return result[0];
  }

  async updateServiceZone(id: string, updates: any): Promise<any> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .update(serviceZones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serviceZones.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceZone(id: string): Promise<void> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    await db.delete(serviceZones).where(eq(serviceZones.id, id));
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

  async getDrivers(): Promise<UserProfile[]> {
    try {
      return await this.dbStorage.getDrivers();
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getDrivers();
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

  async releaseDriverDeliveries(driverId: string): Promise<void> {
    try {
      await this.dbStorage.releaseDriverDeliveries(driverId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.releaseDriverDeliveries(driverId);
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

  // Business settings methods
  async getBusinessSettings(tenantId: string): Promise<any> {
    try {
      return await this.dbStorage.getBusinessSettings(tenantId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getBusinessSettings(tenantId);
    }
  }

  async updateBusinessSettings(tenantId: string, settings: any): Promise<any> {
    try {
      return await this.dbStorage.updateBusinessSettings(tenantId, settings);
    } catch (error) {
      console.error("Database error in updateBusinessSettings:", error);
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.updateBusinessSettings(tenantId, settings);
    }
  }

  // Service zones methods
  async getServiceZones(tenantId: string): Promise<any[]> {
    try {
      return await this.dbStorage.getServiceZones(tenantId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getServiceZones(tenantId);
    }
  }

  async createServiceZone(zone: any): Promise<any> {
    try {
      return await this.dbStorage.createServiceZone(zone);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createServiceZone(zone);
    }
  }

  async updateServiceZone(id: string, updates: any): Promise<any> {
    try {
      return await this.dbStorage.updateServiceZone(id, updates);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.updateServiceZone(id, updates);
    }
  }

  async deleteServiceZone(id: string): Promise<void> {
    try {
      await this.dbStorage.deleteServiceZone(id);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.deleteServiceZone(id);
    }
  }
}

export const storage = new SmartStorage();
