import { 
  type DeliveryRequest, type InsertDeliveryRequest,
  type UserProfile, type InsertUserProfile, type UpdateUserProfile,
  type CustomerLoyaltyAccount, type InsertCustomerLoyaltyAccount, type UpdateCustomerLoyaltyAccount,
  type BusinessStaff, type InsertBusinessStaff, type UpdateBusinessStaff,
  type CustomerProfile, type InsertCustomerProfile, type UpdateCustomerProfile,
  type ClaimDelivery, type UpdateDeliveryStatus,
  type Business, type InsertBusiness,
  type Tenant, type InsertTenant,
  deliveryRequests, userProfiles, customerLoyaltyAccounts, businessStaff, customerProfiles, businesses, businessSettings, serviceZones, tenants 
} from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Removed: Legacy user methods - no longer needed with Supabase Auth
  
  // User profile methods (for Supabase Auth integration)
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: string, updates: UpdateUserProfile): Promise<UserProfile>;
  getUserDeliveries(userId: string): Promise<DeliveryRequest[]>;
  
  // Business staff methods (for invite-based business authentication)
  getBusinessStaff(tenantId: string): Promise<BusinessStaff[]>;
  getBusinessStaffByRole(tenantId: string, role: string): Promise<BusinessStaff[]>;
  getDrivers(tenantId: string): Promise<BusinessStaff[]>; // Get drivers for specific tenant
  createBusinessStaff(staff: InsertBusinessStaff): Promise<BusinessStaff>;
  updateBusinessStaff(id: string, updates: UpdateBusinessStaff): Promise<BusinessStaff>;
  getBusinessStaffById(id: string): Promise<BusinessStaff | undefined>;
  
  // Customer profile methods (for delivery customers)
  getCustomerProfile(id: string): Promise<CustomerProfile | undefined>;
  createCustomerProfile(profile: InsertCustomerProfile): Promise<CustomerProfile>;
  updateCustomerProfile(id: string, updates: UpdateCustomerProfile): Promise<CustomerProfile>;
  
  // Customer loyalty account methods
  getLoyaltyAccount(userId: string, tenantId: string): Promise<CustomerLoyaltyAccount | undefined>;
  createOrUpdateLoyaltyAccount(account: InsertCustomerLoyaltyAccount): Promise<CustomerLoyaltyAccount>;
  updateLoyaltyPoints(userId: string, tenantId: string, points: number, wasFreeDelivery?: boolean): Promise<void>;
  checkLoyaltyEligibility(userId: string, tenantId: string): Promise<boolean>;
  getUserLoyaltyAccounts(userId: string): Promise<CustomerLoyaltyAccount[]>;
  
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
}

export class MemStorage implements IStorage {
  private userProfiles: Map<string, UserProfile>;
  private businessStaff: Map<string, BusinessStaff>;
  private customerProfiles: Map<string, CustomerProfile>;
  private loyaltyAccounts: Map<string, CustomerLoyaltyAccount>; // key: userId-tenantId
  private deliveryRequests: Map<string, DeliveryRequest>;
  private businesses: Map<string, Business>;
  private businessSettings: Map<string, any>;
  private tenants: Map<string, Tenant>;

  constructor() {
    this.userProfiles = new Map();
    this.businessStaff = new Map();
    this.customerProfiles = new Map();
    this.loyaltyAccounts = new Map();
    this.deliveryRequests = new Map();
    this.businesses = new Map();
    this.businessSettings = new Map();
    this.tenants = new Map();
    
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

  // Removed: Legacy user methods - no longer needed with Supabase Auth

  // User profile methods
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(id);
  }

  // Business staff methods (for invite-based business authentication)
  async getBusinessStaff(tenantId: string): Promise<BusinessStaff[]> {
    return Array.from(this.businessStaff.values()).filter(staff => staff.tenantId === tenantId);
  }

  async getBusinessStaffByRole(tenantId: string, role: string): Promise<BusinessStaff[]> {
    return Array.from(this.businessStaff.values()).filter(staff => 
      staff.tenantId === tenantId && staff.role === role
    );
  }

  async getDrivers(tenantId: string): Promise<BusinessStaff[]> {
    return Array.from(this.businessStaff.values()).filter(staff => 
      staff.tenantId === tenantId && staff.role === 'driver'
    );
  }

  async createBusinessStaff(insertStaff: InsertBusinessStaff): Promise<BusinessStaff> {
    const staff: BusinessStaff = {
      ...insertStaff,
      isOnDuty: insertStaff.isOnDuty || false,
      permissions: insertStaff.permissions || {},
      inviteToken: insertStaff.inviteToken || null,
      inviteStatus: insertStaff.inviteStatus || 'pending',
      invitedBy: insertStaff.invitedBy || null,
      invitedAt: insertStaff.invitedAt || null,
      acceptedAt: insertStaff.acceptedAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.businessStaff.set(staff.id, staff);
    return staff;
  }

  async updateBusinessStaff(id: string, updates: UpdateBusinessStaff): Promise<BusinessStaff> {
    const existing = this.businessStaff.get(id);
    if (!existing) {
      throw new Error("Business staff not found");
    }
    const updated: BusinessStaff = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.businessStaff.set(id, updated);
    return updated;
  }

  async getBusinessStaffById(id: string): Promise<BusinessStaff | undefined> {
    return this.businessStaff.get(id);
  }

  // Customer profile methods (for delivery customers)
  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> {
    return this.customerProfiles.get(id);
  }

  async createCustomerProfile(insertProfile: InsertCustomerProfile): Promise<CustomerProfile> {
    const profile: CustomerProfile = {
      ...insertProfile,
      defaultPickupAddress: insertProfile.defaultPickupAddress || null,
      defaultDeliveryAddress: insertProfile.defaultDeliveryAddress || null,
      preferredPaymentMethod: insertProfile.preferredPaymentMethod || null,
      marketingConsent: insertProfile.marketingConsent || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customerProfiles.set(profile.id, profile);
    return profile;
  }

  async updateCustomerProfile(id: string, updates: UpdateCustomerProfile): Promise<CustomerProfile> {
    const existing = this.customerProfiles.get(id);
    if (!existing) {
      throw new Error("Customer profile not found");
    }
    const updated: CustomerProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.customerProfiles.set(id, updated);
    return updated;
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const profile: UserProfile = {
      ...insertProfile,
      tenantId: insertProfile.tenantId || "00000000-0000-0000-0000-000000000001",
      fullName: insertProfile.fullName || null,
      phone: insertProfile.phone || null,
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

  // Customer loyalty account methods
  async getLoyaltyAccount(userId: string, tenantId: string): Promise<CustomerLoyaltyAccount | undefined> {
    const key = `${userId}-${tenantId}`;
    return this.loyaltyAccounts.get(key);
  }

  async createOrUpdateLoyaltyAccount(account: InsertCustomerLoyaltyAccount): Promise<CustomerLoyaltyAccount> {
    const key = `${account.userId}-${account.tenantId}`;
    const existing = this.loyaltyAccounts.get(key);
    
    if (existing) {
      // Update existing account
      const updated: CustomerLoyaltyAccount = {
        ...existing,
        ...account,
        updatedAt: new Date()
      };
      this.loyaltyAccounts.set(key, updated);
      return updated;
    } else {
      // Create new account
      const newAccount: CustomerLoyaltyAccount = {
        id: randomUUID(),
        ...account,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.loyaltyAccounts.set(key, newAccount);
      return newAccount;
    }
  }

  async updateLoyaltyPoints(userId: string, tenantId: string, points: number, wasFreeDelivery: boolean = false): Promise<void> {
    const key = `${userId}-${tenantId}`;
    let account = this.loyaltyAccounts.get(key);
    
    if (!account) {
      // Create new loyalty account if it doesn't exist
      account = await this.createOrUpdateLoyaltyAccount({
        userId,
        tenantId,
        loyaltyPoints: 0,
        totalDeliveries: 0,
        freeDeliveryCredits: 0
      });
    }

    if (wasFreeDelivery) {
      // Use a free delivery credit
      account.freeDeliveryCredits = Math.max(0, account.freeDeliveryCredits - 1);
      account.totalDeliveries = account.totalDeliveries + 1;
    } else {
      // Regular paid delivery
      account.loyaltyPoints = account.loyaltyPoints + points;
      account.totalDeliveries = account.totalDeliveries + 1;
      
      // If loyalty points reach 10, award 1 free credit and reset points to 0
      if (account.loyaltyPoints >= 10) {
        account.freeDeliveryCredits = account.freeDeliveryCredits + 1;
        account.loyaltyPoints = 0; // Reset points after earning free credit
      }
    }
    
    account.updatedAt = new Date();
    this.loyaltyAccounts.set(key, account);
  }

  async checkLoyaltyEligibility(userId: string, tenantId: string): Promise<boolean> {
    const account = await this.getLoyaltyAccount(userId, tenantId);
    return (account?.freeDeliveryCredits || 0) > 0;
  }

  async getUserLoyaltyAccounts(userId: string): Promise<CustomerLoyaltyAccount[]> {
    return Array.from(this.loyaltyAccounts.values()).filter(account => account.userId === userId);
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

  // Removed: Pending signup methods - no longer needed
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

  async createUser(userData: { 
    username: string; 
    password: string; 
    name?: string;
    email?: string;
    tenantId?: string;
    role?: string;
    phone?: string; 
  }): Promise<{ id: string; username: string; tenantId: string }> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(users).values(userData).returning();
    const user = result[0];
    return { id: user.id, username: user.username, tenantId: user.tenantId };
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = result[0];
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  // User profile methods
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1);
    return result[0];
  }

  // Business staff methods (for invite-based business authentication)
  async getBusinessStaff(tenantId: string): Promise<BusinessStaff[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(businessStaff)
      .where(eq(businessStaff.tenantId, tenantId));
    return result;
  }

  async getBusinessStaffByRole(tenantId: string, role: string): Promise<BusinessStaff[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(businessStaff)
      .where(sql`${businessStaff.tenantId} = ${tenantId} AND ${businessStaff.role} = ${role}`);
    return result;
  }

  async getDrivers(tenantId: string): Promise<BusinessStaff[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(businessStaff)
      .where(sql`${businessStaff.tenantId} = ${tenantId} AND ${businessStaff.role} = 'driver'`);
    return result;
  }

  async createBusinessStaff(insertStaff: InsertBusinessStaff): Promise<BusinessStaff> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(businessStaff).values(insertStaff).returning();
    return result[0];
  }

  async updateBusinessStaff(id: string, updates: UpdateBusinessStaff): Promise<BusinessStaff> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .update(businessStaff)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessStaff.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Business staff not found");
    }
    return result[0];
  }

  async getBusinessStaffById(id: string): Promise<BusinessStaff | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(businessStaff).where(eq(businessStaff.id, id)).limit(1);
    return result[0];
  }

  // Customer profile methods (for delivery customers)
  async getCustomerProfile(id: string): Promise<CustomerProfile | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.select().from(customerProfiles).where(eq(customerProfiles.id, id)).limit(1);
    return result[0];
  }

  async createCustomerProfile(insertProfile: InsertCustomerProfile): Promise<CustomerProfile> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db.insert(customerProfiles).values(insertProfile).returning();
    return result[0];
  }

  async updateCustomerProfile(id: string, updates: UpdateCustomerProfile): Promise<CustomerProfile> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .update(customerProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerProfiles.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Customer profile not found");
    }
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

  // Customer loyalty account methods
  async getLoyaltyAccount(userId: string, tenantId: string): Promise<CustomerLoyaltyAccount | undefined> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(customerLoyaltyAccounts)
      .where(sql`${customerLoyaltyAccounts.userId} = ${userId} AND ${customerLoyaltyAccounts.tenantId} = ${tenantId}`)
      .limit(1);
    return result[0];
  }

  async createOrUpdateLoyaltyAccount(account: InsertCustomerLoyaltyAccount): Promise<CustomerLoyaltyAccount> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    // Use PostgreSQL UPSERT to handle create or update
    const result = await db
      .insert(customerLoyaltyAccounts)
      .values(account)
      .onConflictDoUpdate({
        target: [customerLoyaltyAccounts.userId, customerLoyaltyAccounts.tenantId],
        set: {
          loyaltyPoints: account.loyaltyPoints,
          totalDeliveries: account.totalDeliveries,
          freeDeliveryCredits: account.freeDeliveryCredits,
          updatedAt: new Date()
        }
      })
      .returning();
    return result[0];
  }

  async updateLoyaltyPoints(userId: string, tenantId: string, points: number, wasFreeDelivery: boolean = false): Promise<void> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    
    let account = await this.getLoyaltyAccount(userId, tenantId);
    
    if (!account) {
      // Create new loyalty account if it doesn't exist
      account = await this.createOrUpdateLoyaltyAccount({
        userId,
        tenantId,
        loyaltyPoints: 0,
        totalDeliveries: 0,
        freeDeliveryCredits: 0
      });
    }

    let newLoyaltyPoints: number;
    let newFreeCredits: number;
    let newTotalDeliveries: number;

    if (wasFreeDelivery) {
      // Use a free delivery credit
      newLoyaltyPoints = account.loyaltyPoints;
      newFreeCredits = Math.max(0, account.freeDeliveryCredits - 1);
      newTotalDeliveries = account.totalDeliveries + 1;
    } else {
      // Regular paid delivery
      newLoyaltyPoints = account.loyaltyPoints + points;
      newTotalDeliveries = account.totalDeliveries + 1;
      
      // If loyalty points reach 10, award 1 free credit and reset points to 0
      if (newLoyaltyPoints >= 10) {
        newFreeCredits = account.freeDeliveryCredits + 1;
        newLoyaltyPoints = 0; // Reset points after earning free credit
      } else {
        newFreeCredits = account.freeDeliveryCredits;
      }
    }

    await this.createOrUpdateLoyaltyAccount({
      userId,
      tenantId,
      loyaltyPoints: newLoyaltyPoints,
      totalDeliveries: newTotalDeliveries,
      freeDeliveryCredits: newFreeCredits
    });
  }

  async checkLoyaltyEligibility(userId: string, tenantId: string): Promise<boolean> {
    const account = await this.getLoyaltyAccount(userId, tenantId);
    return (account?.freeDeliveryCredits || 0) > 0;
  }

  async getUserLoyaltyAccounts(userId: string): Promise<CustomerLoyaltyAccount[]> {
    if (!(await this.testConnection())) {
      throw new Error("Database connection unavailable");
    }
    const result = await db
      .select()
      .from(customerLoyaltyAccounts)
      .where(eq(customerLoyaltyAccounts.userId, userId));
    return result;
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

  async createUser(userData: { 
    username: string; 
    password: string; 
    name?: string;
    email?: string;
    tenantId?: string;
    role?: string;
    phone?: string; 
  }): Promise<{ id: string; username: string; tenantId: string }> {
    try {
      return await this.dbStorage.createUser(userData);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.createUser(userData);
    }
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      return await this.dbStorage.authenticateUser(username, password);
    } catch (error) {
      console.warn("Database unavailable, using memory storage");
      return await this.memStorage.authenticateUser(username, password);
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
