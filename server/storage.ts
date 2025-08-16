import { 
  type User, type InsertUser, type DeliveryRequest, type InsertDeliveryRequest,
  type UserProfile, type InsertUserProfile, type UpdateUserProfile,
  type ClaimDelivery, type UpdateDeliveryStatus,
  type Business, type InsertBusiness,
  type Tenant, type InsertTenant,
  type PendingSignup, type InsertPendingSignup,
  users, deliveryRequests, userProfiles, businesses, businessSettings, serviceZones, tenants, pendingSignups 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db.js";
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
  getUserLoyalty(userId: string): Promise<any>;
  getUserDeliveries(userId: string): Promise<DeliveryRequest[]>;
  
  // Delivery request methods
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;
  getDeliveryRequests(userId?: string): Promise<DeliveryRequest[]>;
  getDeliveryRequestById(id: string): Promise<DeliveryRequest | undefined>;
  updateDeliveryRequest(id: string, updates: Partial<DeliveryRequest>): Promise<DeliveryRequest>;
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
  
  // Tenant methods
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  createTenant(tenant: Partial<Tenant>): Promise<Tenant>;
  createBusinessSettings(settings: any): Promise<any>;
  
  // Pending signup methods
  createPendingSignup(signup: InsertPendingSignup): Promise<PendingSignup>;
  getPendingSignup(token: string): Promise<PendingSignup | undefined>;
  deletePendingSignup(token: string): Promise<void>;
  cleanupExpiredSignups(): Promise<void>;
  checkSubdomainAvailable(subdomain: string, excludeEmail?: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<string, UserProfile>;
  private deliveryRequests: Map<string, DeliveryRequest>;
  private businesses: Map<string, Business>;
  private businessSettings: Map<string, any>;
  private tenants: Map<string, Tenant>;
  private pendingSignups: Map<string, PendingSignup>;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.deliveryRequests = new Map();
    this.businesses = new Map();
    this.businessSettings = new Map();
    this.tenants = new Map();
    this.pendingSignups = new Map();
    
    // Initialize default business settings for Sara's Quickie Delivery
    this.businessSettings.set('00000000-0000-0000-0000-000000000001', {
      id: '7381d5ba-eb88-4424-ba12-4952e8a184b5',
      tenantId: '00000000-0000-0000-0000-000000000001',
      baseDeliveryFee: '3.00',
      pricePerMile: '1.50',
      minimumOrderValue: '10.00',
      rushDeliveryMultiplier: '1.50',
      baseFeeRadius: '10.00',
      freeDeliveryThreshold: '50.00',
      pointsForFreeDelivery: 10,
      businessName: "Sara's Quickie Delivery",
      businessEmail: "contact@sarasquickiedelivery.com",
      businessPhone: "(641) 673-0123",
      businessAddress: "1004 A Ave E, Oskaloosa, IA 52577",
      primaryColor: "#0369a1",
      secondaryColor: "#64748b",
      accentColor: "#ea580c",
      currency: "USD",
      timezone: "America/Chicago",
      enableLoyaltyProgram: true,
      enableRealTimeTracking: true,
      enableScheduledDeliveries: false,
      customerNotifications: {
        email: true,
        sms: false
      },
      operatingHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '10:00', close: '16:00', closed: false },
        sunday: { open: '12:00', close: '16:00', closed: true }
      }
    });
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

  async getUserLoyalty(userId: string): Promise<any> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return {
        loyaltyPoints: 0,
        freeDeliveryCredits: 0,
        totalDeliveries: 0,
        nextFreeAt: 10
      };
    }
    return {
      loyaltyPoints: profile.loyaltyPoints || 0,
      freeDeliveryCredits: profile.freeDeliveryCredits || 0,
      totalDeliveries: profile.totalDeliveries || 0,
      nextFreeAt: 10 - (profile.loyaltyPoints || 0)
    };
  }

  async getUserDeliveries(userId: string): Promise<DeliveryRequest[]> {
    return Array.from(this.deliveryRequests.values()).filter(r => r.userId === userId);
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
      squarePaymentId: null,
      squareInvoiceId: null,
      paymentStatus: "pending",
      totalAmount: null,
      invoiceUrl: null,
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

  async getDeliveryRequestById(id: string): Promise<DeliveryRequest | undefined> {
    return this.deliveryRequests.get(id);
  }

  async updateDeliveryRequest(id: string, updates: Partial<DeliveryRequest>): Promise<DeliveryRequest> {
    const existing = this.deliveryRequests.get(id);
    if (!existing) {
      throw new Error(`Delivery request with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.deliveryRequests.set(id, updated);
    return updated;
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
      imageUrl: insertBusiness.imageUrl || null,
      isActive: insertBusiness.isActive ?? true,
      createdAt: new Date()
    };
    this.businesses.set(id, business);
    return business;
  }

  // Business settings methods
  async getBusinessSettings(tenantId: string): Promise<any> {
    return this.businessSettings.get(tenantId) || null;
  }

  async updateBusinessSettings(tenantId: string, settings: any): Promise<any> {
    const existing = this.businessSettings.get(tenantId) || {};
    const updated = { ...existing, ...settings, tenantId };
    this.businessSettings.set(tenantId, updated);
    return updated;
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

  // Tenant methods (memory storage)
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    for (const tenant of this.tenants.values()) {
      if (tenant.subdomain === subdomain) {
        return tenant;
      }
    }
    return undefined;
  }

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    const id = randomUUID();
    const newTenant: Tenant = {
      id,
      companyName: tenant.companyName || '',
      subdomain: tenant.subdomain || '',
      customDomain: tenant.customDomain || null,
      slug: tenant.slug || null,
      logoUrl: tenant.logoUrl || null,
      primaryColor: tenant.primaryColor || '#0369a1',
      isActive: tenant.isActive !== false,
      planType: tenant.planType || 'trial',
      ownerName: tenant.ownerName || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      businessAddress: tenant.businessAddress || '',
      city: tenant.city || '',
      state: tenant.state || '',
      zipCode: tenant.zipCode || '',
      businessType: tenant.businessType || '',
      currentDeliveryVolume: tenant.currentDeliveryVolume || '',
      description: tenant.description || null,
      trialStartDate: tenant.trialStartDate || new Date(),
      trialEndDate: tenant.trialEndDate || null,
      stripeCustomerId: tenant.stripeCustomerId || null,
      stripeSubscriptionId: tenant.stripeSubscriptionId || null,
      billingStatus: tenant.billingStatus || 'trial',
      nextBillingDate: tenant.nextBillingDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }

  async createBusinessSettings(settings: any): Promise<any> {
    const id = randomUUID();
    const newSettings = { ...settings, id };
    this.businessSettings.set(settings.tenantId, newSettings);
    return newSettings;
  }

  // Pending signup methods (memory storage)
  async createPendingSignup(insertSignup: InsertPendingSignup): Promise<PendingSignup> {
    const id = randomUUID();
    const signup: PendingSignup = {
      id,
      ...insertSignup,
      createdAt: new Date(),
    };
    this.pendingSignups.set(insertSignup.verificationToken, signup);
    return signup;
  }

  async getPendingSignup(token: string): Promise<PendingSignup | undefined> {
    return this.pendingSignups.get(token);
  }

  async deletePendingSignup(token: string): Promise<void> {
    this.pendingSignups.delete(token);
  }

  async cleanupExpiredSignups(): Promise<void> {
    const now = new Date();
    for (const [token, signup] of this.pendingSignups.entries()) {
      if (signup.expiresAt < now) {
        this.pendingSignups.delete(token);
      }
    }
  }

  async checkSubdomainAvailable(subdomain: string, excludeEmail?: string): Promise<boolean> {
    // Check existing tenants
    for (const tenant of this.tenants.values()) {
      if (tenant.subdomain === subdomain && tenant.email !== excludeEmail) {
        return false;
      }
    }
    
    // Check pending signups
    for (const signup of this.pendingSignups.values()) {
      const signupData = signup.signupData as any;
      if (signupData.subdomain === subdomain && signup.email !== excludeEmail) {
        return false;
      }
    }
    
    return true;
  }
}

export class DatabaseStorage implements IStorage {
  private connectionCache: boolean | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  // Method to force clear cache for testing
  public clearConnectionCache(): void {
    this.connectionCache = null;
    this.cacheTimestamp = 0;
    console.log("Database connection cache cleared");
  }

  private async testConnection(): Promise<boolean> {
    // Use cached result for 30 seconds to reduce connection overhead
    const now = Date.now();
    if (this.connectionCache !== null && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log("Using cached database connection result:", this.connectionCache);
      return this.connectionCache;
    }

    try {
      // Test the database connection with a simple query
      console.log("Testing database connection...");
      const result = await db.execute(sql`SELECT 1 as test`);
      console.log("Database connection test successful:", result);
      this.connectionCache = true;
      this.cacheTimestamp = now;
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      this.connectionCache = false;
      this.cacheTimestamp = now;
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

  async getUserLoyalty(userId: string): Promise<any> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return {
        loyaltyPoints: 0,
        freeDeliveryCredits: 0,
        totalDeliveries: 0,
        nextFreeAt: 10
      };
    }
    return {
      loyaltyPoints: profile.loyaltyPoints || 0,
      freeDeliveryCredits: profile.freeDeliveryCredits || 0,
      totalDeliveries: profile.totalDeliveries || 0,
      nextFreeAt: 10 - (profile.loyaltyPoints || 0)
    };
  }

  async getUserDeliveries(userId: string): Promise<DeliveryRequest[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    return await db.select().from(deliveryRequests).where(eq(deliveryRequests.userId, userId));
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
    
    try {
      console.log("DatabaseStorage: Attempting to query delivery_requests table...");
      
      if (userId) {
        const result = await db.select().from(deliveryRequests).where(eq(deliveryRequests.userId, userId));
        console.log("DatabaseStorage: User-specific delivery requests query successful:", result.length);
        return result;
      }
      
      const result = await db.select().from(deliveryRequests);
      console.log("DatabaseStorage: All delivery requests query successful:", result.length);
      return result;
    } catch (error) {
      console.error("DatabaseStorage: Database query error in getDeliveryRequests:", error);
      throw error;
    }
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

  async getDeliveryRequestById(id: string): Promise<DeliveryRequest | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(deliveryRequests).where(eq(deliveryRequests.id, id)).limit(1);
    return result[0];
  }

  async updateDeliveryRequest(id: string, updates: Partial<DeliveryRequest>): Promise<DeliveryRequest> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .update(deliveryRequests)
      .set(updates)
      .where(eq(deliveryRequests.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Delivery request with id ${id} not found`);
    }
    return result[0];
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
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(businessSettings).where(eq(businessSettings.tenantId, tenantId));
    return result[0] || null;
  }

  async updateBusinessSettings(tenantId: string, settings: any): Promise<any> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
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

  // Tenant methods
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
    return result[0];
  }

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(tenants).values(tenant as any).returning();
    return result[0];
  }

  async createBusinessSettings(settings: any): Promise<any> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(businessSettings).values(settings).returning();
    return result[0];
  }

  // Pending signup methods (database)
  async createPendingSignup(insertSignup: InsertPendingSignup): Promise<PendingSignup> {
    try {
      const result = await db.insert(pendingSignups).values(insertSignup).returning();
      return result[0];
    } catch (error) {
      console.error("Database error in createPendingSignup:", error);
      throw new Error("Database connection unavailable");
    }
  }

  async getPendingSignup(token: string): Promise<PendingSignup | undefined> {
    try {
      const result = await db.select().from(pendingSignups).where(eq(pendingSignups.verificationToken, token)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Database error in getPendingSignup:", error);
      throw new Error("Database connection unavailable");
    }
  }

  async deletePendingSignup(token: string): Promise<void> {
    try {
      await db.delete(pendingSignups).where(eq(pendingSignups.verificationToken, token));
    } catch (error) {
      console.error("Database error in deletePendingSignup:", error);
      throw new Error("Database connection unavailable");
    }
  }

  async cleanupExpiredSignups(): Promise<void> {
    try {
      await db.delete(pendingSignups).where(sql`${pendingSignups.expiresAt} < NOW()`);
    } catch (error) {
      console.error("Database error in cleanupExpiredSignups:", error);
      throw new Error("Database connection unavailable");
    }
  }

  async checkSubdomainAvailable(subdomain: string, excludeEmail?: string): Promise<boolean> {
    try {
      // Check existing tenants
      const existingTenant = await db.select().from(tenants)
        .where(excludeEmail ? 
          sql`${tenants.subdomain} = ${subdomain} AND ${tenants.email} != ${excludeEmail}` :
          eq(tenants.subdomain, subdomain)
        ).limit(1);
      
      if (existingTenant.length > 0) {
        return false;
      }

      // Check pending signups (use JSONB signupData)
      const existingPending = await db.select().from(pendingSignups)
        .where(excludeEmail ?
          sql`${pendingSignups.signupData}->>'subdomain' = ${subdomain} AND ${pendingSignups.email} != ${excludeEmail}` :
          sql`${pendingSignups.signupData}->>'subdomain' = ${subdomain}`
        ).limit(1);

      return existingPending.length === 0;
    } catch (error) {
      console.error("Database error in checkSubdomainAvailable:", error);
      throw new Error("Database connection unavailable");
    }
  }
}

// Smart storage selection - try database first, fallback to memory
class SmartStorage implements IStorage {
  private memStorage = new MemStorage();
  public dbStorage = new DatabaseStorage(); // Make this public so routes can access it directly
  
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

  async getUserLoyalty(userId: string): Promise<any> {
    try {
      return await this.dbStorage.getUserLoyalty(userId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getUserLoyalty(userId);
    }
  }

  async getUserDeliveries(userId: string): Promise<DeliveryRequest[]> {
    try {
      return await this.dbStorage.getUserDeliveries(userId);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getUserDeliveries(userId);
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
      console.error("Specific database error:", error);
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

  async getDeliveryRequestById(id: string): Promise<DeliveryRequest | undefined> {
    try {
      return await this.dbStorage.getDeliveryRequestById(id);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getDeliveryRequestById(id);
    }
  }

  async updateDeliveryRequest(id: string, updates: Partial<DeliveryRequest>): Promise<DeliveryRequest> {
    try {
      return await this.dbStorage.updateDeliveryRequest(id, updates);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.updateDeliveryRequest(id, updates);
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

  // Tenant methods
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    try {
      return await this.dbStorage.getTenantBySubdomain(subdomain);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getTenantBySubdomain(subdomain);
    }
  }

  async createTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    try {
      return await this.dbStorage.createTenant(tenant);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createTenant(tenant);
    }
  }

  async createBusinessSettings(settings: any): Promise<any> {
    try {
      return await this.dbStorage.createBusinessSettings(settings);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createBusinessSettings(settings);
    }
  }

  // Pending signup methods
  async createPendingSignup(signup: InsertPendingSignup): Promise<PendingSignup> {
    try {
      return await this.dbStorage.createPendingSignup(signup);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createPendingSignup(signup);
    }
  }

  async getPendingSignup(token: string): Promise<PendingSignup | undefined> {
    try {
      return await this.dbStorage.getPendingSignup(token);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.getPendingSignup(token);
    }
  }

  async deletePendingSignup(token: string): Promise<void> {
    try {
      await this.dbStorage.deletePendingSignup(token);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.deletePendingSignup(token);
    }
  }

  async cleanupExpiredSignups(): Promise<void> {
    try {
      await this.dbStorage.cleanupExpiredSignups();
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      await this.memStorage.cleanupExpiredSignups();
    }
  }

  async checkSubdomainAvailable(subdomain: string, excludeEmail?: string): Promise<boolean> {
    try {
      return await this.dbStorage.checkSubdomainAvailable(subdomain, excludeEmail);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.checkSubdomainAvailable(subdomain, excludeEmail);
    }
  }
}

export { SmartStorage };
export const storage = new SmartStorage();
