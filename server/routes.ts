import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, SmartStorage } from "./storage.js";
import dispatchRoutes from "./dispatch-routes.js";
import adminRoutes from "./admin-routes.js";
import { getCurrentTenant, getCurrentTenantId } from "./tenant.js";
import { 
  insertDeliveryRequestSchema, 
  insertUserProfileSchema, 
  updateUserProfileSchema,
  insertDeliveryRequestGuestSchema,
  insertDeliveryRequestAuthenticatedSchema,
  claimDeliverySchema,
  updateDeliveryStatusSchema,
  updateDriverStatusSchema,
  insertBusinessSchema,
  insertTenantSchema,

  combinedBusinessSignupSchema
} from "../shared/schema.js";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage.js";
import { googleMapsService } from "./googleMaps.js";
import { GooglePlacesService } from "./googlePlaces.js";
import { db } from "./db.js";
import { deliveryRequests } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { supabase as supabaseClient } from "./supabaseStorage.js";
const supabase = supabaseClient;

// Helper function to get business type defaults
function getBusinessTypeDefaults(businessType: string) {
  const defaults: Record<string, any> = {
    'Multi-Service Delivery': {
      planType: 'trial',
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      deliveryPricing: {
        basePrice: 3.00,
        pricePerMile: 1.50,
        minimumOrder: 10.00,
        freeDeliveryThreshold: 50.00,
        rushDeliveryMultiplier: 1.5
      },
      loyaltyProgram: {
        deliveriesForFreeDelivery: 10
      }
    },
    'Restaurant Delivery Only': {
      planType: 'trial',
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deliveryPricing: {
        basePrice: 2.50,
        pricePerMile: 1.00,
        minimumOrder: 15.00,
        freeDeliveryThreshold: 35.00,
        rushDeliveryMultiplier: 1.5
      },
      loyaltyProgram: {
        deliveriesForFreeDelivery: 8
      }
    }
  };

  return defaults[businessType] || defaults['Multi-Service Delivery'];
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Tenant Information Route
  app.get("/api/tenant", async (req, res) => {
    try {
      const tenant = getCurrentTenant(req);
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tenant Signup Routes
  app.post("/api/tenants/check-subdomain", async (req, res) => {
    try {
      const { subdomain, email } = req.body;
      
      if (!subdomain) {
        return res.status(400).json({ message: "Subdomain is required" });
      }

      // Check if subdomain is available (excluding current user's email)
      const available = await storage.checkSubdomainAvailable(subdomain, email);
      
      res.json({ 
        available,
        subdomain 
      });
    } catch (error) {
      console.error("Error checking subdomain:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stage 1: Initiate signup with email verification
  app.post("/api/tenants/signup-initiate", async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        primaryColor,
      } = req.body;

      // Generate subdomain from business name
      const subdomain = businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .slice(0, 50);

      // Check subdomain availability
      const subdomainAvailable = await storage.checkSubdomainAvailable(subdomain, email);
      if (!subdomainAvailable) {
        return res.status(400).json({ 
          message: "A business with this name already exists. Please choose a different name." 
        });
      }

      // Generate verification token and expiry (24 hours)
      const verificationToken = Math.random().toString(36).substr(2, 32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Store pending signup
      await storage.createPendingSignup({
        email,
        signupData: {
          businessName,
          ownerName,
          phone,
          businessAddress,
          city,
          state,
          zipCode,
          businessType,
          currentDeliveryVolume,
          subdomain,
          primaryColor: primaryColor || '#0369a1',
        },
        verificationToken,
        expiresAt,
      });

      // Here we would normally send verification email
      // For now, return success with token for development/testing
      res.json({
        message: "Verification email sent. Please check your email and click the verification link.",
        email,
        subdomain,
        // Remove token from production - only for development
        developmentToken: verificationToken
      });

    } catch (error) {
      console.error("Error initiating signup:", error);
      res.status(500).json({ message: "Failed to initiate signup. Please try again." });
    }
  });

  // Stage 2: Complete signup after email verification
  app.post("/api/tenants/signup-complete", async (req, res) => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        return res.status(400).json({ message: "Verification token and user ID are required." });
      }

      // Get pending signup
      const pendingSignup = await storage.getPendingSignup(token);
      if (!pendingSignup) {
        return res.status(400).json({ message: "Invalid or expired verification link." });
      }

      // Check if token is expired
      if (new Date() > pendingSignup.expiresAt) {
        await storage.deletePendingSignup(token);
        return res.status(400).json({ message: "Verification link has expired. Please sign up again." });
      }

      const signupData = pendingSignup.signupData as any;

      // Double-check subdomain is still available
      const subdomainAvailable = await storage.checkSubdomainAvailable(
        signupData.subdomain, 
        pendingSignup.email
      );
      if (!subdomainAvailable) {
        await storage.deletePendingSignup(token);
        return res.status(400).json({ 
          message: "Subdomain is no longer available. Please start signup process again." 
        });
      }

      // Get business type defaults
      const businessTypeDefaults = getBusinessTypeDefaults(signupData.businessType);

      // Create tenant
      const tenantData = {
        companyName: signupData.businessName,
        ownerName: signupData.ownerName,
        email: pendingSignup.email,
        phone: signupData.phone,
        businessAddress: signupData.businessAddress,
        city: signupData.city,
        state: signupData.state,
        zipCode: signupData.zipCode,
        businessType: signupData.businessType,
        currentDeliveryVolume: signupData.currentDeliveryVolume,
        subdomain: signupData.subdomain,
        primaryColor: signupData.primaryColor,
        isActive: true,
        userId: userId, // Supabase user ID
        emailVerified: true, // Already verified
        ...businessTypeDefaults
      };

      const tenant = await storage.createTenant(tenantData);

      // Create default business settings with business name
      const defaultBusinessSettings = {
        tenantId: tenant.id,
        businessName: signupData.businessName,
        serviceName: signupData.businessName, // Use businessName for service name too
        businessEmail: pendingSignup.email,
        businessPhone: signupData.phone,
        businessAddress: signupData.businessAddress,
        primaryColor: signupData.primaryColor || "#0369a1",
        secondaryColor: "#64748b",
        accentColor: "#ea580c",
        currency: "USD",
        timezone: "America/Chicago",
        baseDeliveryFee: "4.99",
        pricePerMile: "1.50",
        minimumOrderValue: "10.00",
        freeDeliveryThreshold: "25.00",
        rushDeliveryMultiplier: "1.5",
        baseFeeRadius: "10.0",
        pointsForFreeDelivery: 10,
        enableLoyaltyProgram: true,
        enableRealTimeTracking: true,
        enableScheduledDeliveries: false,
        acceptedPaymentMethods: ['cash_on_delivery', 'card_on_delivery'],
        operatingHours: {
          monday: { open: '08:00', close: '20:00', closed: false },
          tuesday: { open: '08:00', close: '20:00', closed: false },
          wednesday: { open: '08:00', close: '20:00', closed: false },
          thursday: { open: '08:00', close: '20:00', closed: false },
          friday: { open: '08:00', close: '20:00', closed: false },
          saturday: { open: '08:00', close: '20:00', closed: false },
          sunday: { open: '10:00', close: '18:00', closed: false }
        }
      };

      await storage.createBusinessSettings(defaultBusinessSettings);

      // Create admin user profile in storage
      const adminProfile = {
        id: userId,
        email: pendingSignup.email,
        phone: signupData.phone,
        tenantId: tenant.id,
        fullName: signupData.ownerName,
        role: 'admin' as const,
        isActive: true
      };

      await storage.createUserProfile(adminProfile);

      // Clean up pending signup
      await storage.deletePendingSignup(token);

      res.status(201).json({
        message: "Account created successfully! You can now access your delivery management dashboard.",
        subdomain: signupData.subdomain,
        businessName: signupData.businessName,
        tenantId: tenant.id,
        redirectUrl: `https://${signupData.subdomain}.alltowndelivery.com`
      });

    } catch (error) {
      console.error("Error completing signup:", error);
      res.status(500).json({ message: "Failed to create account. Please try again." });
    }
  });

  // New endpoint for verified email signup
  app.post("/api/tenants/signup-verified", async (req, res) => {
    try {
      // Validate the request body with verified email data
      const {
        businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor,
        userId, // Supabase user ID
        emailVerified
      } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          message: "User ID is required." 
        });
      }

      // Check if subdomain already exists
      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      if (existingTenant) {
        return res.status(400).json({ 
          message: "Subdomain already exists. Please choose a different business name." 
        });
      }

      // Create business settings based on business type
      const businessTypeDefaults = getBusinessTypeDefaults(businessType);

      // Create tenant data compatible with storage interface
      const tenantData = {
        companyName: businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor: primaryColor || '#0369a1',
        isActive: true,
        supabaseUserId: userId,
        emailVerified: true,
        ...businessTypeDefaults
      };

      const tenant = await storage.createTenant(tenantData);

      // TODO: Send activation/welcome email with login instructions
      // This would include temporary admin credentials and subdomain info

      res.status(201).json({
        message: "Tenant created successfully",
        subdomain,
        businessName,
        tenantId: tenant.id,
        activationEmailSent: true
      });

    } catch (error) {
      console.error("Error creating verified tenant:", error);
      res.status(500).json({ 
        message: "Failed to create tenant account. Please try again." 
      });
    }
  });

  app.post("/api/tenants/signup", async (req, res) => {
    try {
      // Validate the request body
      const {
        businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor,
        description
      } = req.body;
      
      // Validate required fields
      if (!businessName || !ownerName || !email || !phone || !businessAddress || !city || !state || !zipCode || !businessType || !currentDeliveryVolume || !subdomain) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }
      
      // Check subdomain availability again
      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      if (existingTenant) {
        return res.status(400).json({ message: "Subdomain is already taken" });
      }

      // Set trial dates
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialStartDate.getDate() + 30); // 30-day trial

      // Create tenant
      const tenantData = {
        companyName: businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor: primaryColor || "#0369a1",
        description,
        isActive: true,
        planType: 'trial' as const,
        trialStartDate,
        trialEndDate,
        billingStatus: 'trial' as const
      };

      const newTenant = await storage.createTenant(tenantData);
      
      // Create default business settings for this tenant
      const defaultBusinessSettings = {
        tenantId: newTenant.id,
        businessName: businessName,
        businessPhone: phone,
        businessEmail: email,
        businessAddress: `${businessAddress}, ${city}, ${state} ${zipCode}`,
        primaryColor: primaryColor || "#0369a1",
        secondaryColor: "#64748b",
        accentColor: "#ea580c",
        deliveryPricing: {
          basePrice: 3.00,
          pricePerMile: 1.50,
          minimumOrder: 10.00,
          freeDeliveryThreshold: 50.00
        },
        distanceSettings: {
          baseFeeRadius: 10.0
        },
        features: {
          loyaltyProgram: true,
          realTimeTracking: true,
          scheduledDeliveries: false,
          multiplePaymentMethods: true
        },
        acceptedPaymentMethods: ['cash_on_delivery', 'card_on_delivery'],
        businessHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '12:00', close: '16:00', closed: true }
        }
      };

      await storage.createBusinessSettings(defaultBusinessSettings);

      res.json({
        success: true,
        message: "Account created successfully!",
        tenant: newTenant,
        subdomain: newTenant.subdomain
      });
    } catch (error: any) {
      console.error("Error creating tenant:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // New unified Supabase signup endpoint
  app.post("/api/tenants/create-from-auth", async (req, res) => {
    try {
      const { userId, businessData } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          message: "User ID is required." 
        });
      }

      if (!businessData) {
        return res.status(400).json({ 
          message: "Business data is required." 
        });
      }

      // Extract business data from request
      const {
        businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor
      } = businessData;

      // Validate required fields
      if (!businessName || !ownerName || !email || !phone || !businessAddress || !city || !state || !zipCode || !businessType || !currentDeliveryVolume || !subdomain) {
        return res.status(400).json({ 
          message: "All required business fields must be provided." 
        });
      }

      // Check if subdomain already exists
      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      if (existingTenant) {
        return res.status(400).json({ 
          message: "Subdomain already exists. Please choose a different business name." 
        });
      }

      // Get business type defaults
      const businessTypeDefaults = getBusinessTypeDefaults(businessType);

      // Create tenant data
      const tenantData = {
        companyName: businessName,
        ownerName,
        email,
        phone,
        businessAddress,
        city,
        state,
        zipCode,
        businessType,
        currentDeliveryVolume,
        subdomain,
        primaryColor: primaryColor || '#0369a1',
        isActive: true,
        supabaseUserId: userId,
        emailVerified: true,
        ...businessTypeDefaults
      };

      const tenant = await storage.createTenant(tenantData);

      // Create default business settings for the new tenant
      const businessSettings = {
        tenantId: tenant.id,
        businessName: businessName,
        businessPhone: phone,
        businessEmail: email,
        businessAddress: businessAddress,
        primaryColor: primaryColor || '#0369a1',
        secondaryColor: '#64748b',
        accentColor: '#ea580c',
        enableLoyaltyProgram: businessTypeDefaults.loyaltyProgram?.deliveriesForFreeDelivery ? true : false,
        enableScheduledDeliveries: false,
        baseDeliveryFee: businessTypeDefaults.deliveryPricing?.basePrice?.toString() || '3.00',
        pricePerMile: businessTypeDefaults.deliveryPricing?.pricePerMile?.toString() || '1.50',
        minimumOrderValue: businessTypeDefaults.deliveryPricing?.minimumOrder?.toString() || '10.00',
        freeDeliveryThreshold: businessTypeDefaults.deliveryPricing?.freeDeliveryThreshold?.toString() || '50.00',
        baseFeeRadius: '10.0',
        acceptedPaymentMethods: ['cash_on_delivery', 'card_on_delivery'],
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '12:00', close: '16:00', closed: true }
        }
      };

      await storage.createBusinessSettings(businessSettings);

      // Create admin user profile for business owner
      const adminProfile = {
        id: userId, // Use Supabase user ID as profile ID
        tenantId: tenant.id,
        email: email,
        fullName: ownerName,
        phone: phone,
        role: 'admin'
      };

      await storage.createUserProfile(adminProfile);

      res.status(201).json({
        message: "Business account created successfully! You now have admin access to your delivery management dashboard.",
        subdomain: subdomain,
        businessName: businessName,
        tenantId: tenant.id,
        userRole: "admin",
        adminSetupRequired: true, // Flag to indicate admin needs to set password
        redirectUrl: `https://${subdomain}.alltowndelivery.com/admin-setup`
      });

    } catch (error) {
      console.error("Error creating tenant from auth:", error);
      res.status(500).json({ 
        message: "Failed to create business account. Please try again." 
      });
    }
  });

  // Tenant testing routes (development only)
  if (process.env.NODE_ENV === 'development') {
    const { createTestTenantData, testTenantIsolation, cleanupTestTenantData } = await import('./tenant-test');
    
    app.post("/api/tenant/test/create", async (req, res) => {
      try {
        const result = await createTestTenantData();
        res.json({ message: "Test tenant data created", data: result });
      } catch (error) {
        console.error("Error creating test data:", error);
        res.status(500).json({ message: "Failed to create test data" });
      }
    });

    app.get("/api/tenant/test/isolation", async (req, res) => {
      try {
        const currentTenantId = getCurrentTenantId(req);
        const result = await testTenantIsolation(currentTenantId);
        res.json({ tenantId: currentTenantId, isolation: result });
      } catch (error) {
        console.error("Error testing isolation:", error);
        res.status(500).json({ message: "Failed to test isolation" });
      }
    });

    app.delete("/api/tenant/test/cleanup", async (req, res) => {
      try {
        await cleanupTestTenantData();
        res.json({ message: "Test tenant data cleaned up" });
      } catch (error) {
        console.error("Error cleaning up test data:", error);
        res.status(500).json({ message: "Failed to cleanup test data" });
      }
    });
  }

  // User Profile Routes
  
  // Get user profile (create if needed) with business staff role
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      let profile = await storage.getUserProfile(id);
      
      if (!profile) {
        // Create default profile
        const defaultProfile = {
          id,
          fullName: "New User",
          email: "",
          phone: "",
          tenantId: getCurrentTenantId(req),
        };
        profile = await storage.createUserProfile(defaultProfile);
      }
      
      // Check if user has business staff role
      const staffMember = await storage.getBusinessStaffById(id);
      
      // Merge profile with business staff information
      const profileWithRole = {
        ...profile,
        role: staffMember?.role || 'customer',
        isOnDuty: staffMember?.isOnDuty || false,
        inviteStatus: staffMember?.inviteStatus || null,
        permissions: staffMember?.permissions || null,
        userType: staffMember ? 'business_staff' : 'customer'
      };
      
      res.json(profileWithRole);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create user profile
  app.post("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const profileData = insertUserProfileSchema.parse({ ...req.body, id });
      const profile = await storage.createUserProfile(profileData);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      } else {
        console.error("Error creating user profile:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Update user profile
  app.put("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateUserProfileSchema.parse(req.body);
      const profile = await storage.updateUserProfile(id, updates);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      } else {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get user loyalty information
  app.get("/api/users/:id/loyalty", async (req, res) => {
    try {
      const { id } = req.params;
      const loyaltyInfo = await storage.getUserLoyalty(id);
      res.json(loyaltyInfo);
    } catch (error) {
      console.error("Error fetching loyalty info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's delivery history
  app.get("/api/users/:id/deliveries", async (req, res) => {
    try {
      const { id } = req.params;
      const deliveries = await storage.getUserDeliveries(id);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching user deliveries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business Routes
  
  // Get all businesses
  // Admin setup and password management
  app.get("/api/admin/status", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const tenant = getCurrentTenant(req);
      
      // Check if this is the main site
      if ((req as any).isMainSite) {
        return res.status(404).json({ message: "Admin status not available for main site" });
      }

      // For now, return basic admin status
      // TODO: Check if user has completed admin setup
      res.json({
        isAdmin: true, // Placeholder - should check actual admin status
        businessName: tenant.companyName,
        tenantId: tenantId
      });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  app.post("/api/admin/setup-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const tenantId = getCurrentTenantId(req);
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new passwords are required" });
      }

      // TODO: Implement actual password verification and update
      // For now, return success with business info
      const businessSettings = await storage.getBusinessSettings(tenantId);
      
      res.json({
        message: "Admin password configured successfully",
        businessInfo: {
          businessName: businessSettings?.businessName,
          businessEmail: businessSettings?.businessEmail
        }
      });
    } catch (error) {
      console.error("Error setting up admin password:", error);
      res.status(500).json({ message: "Failed to setup admin password" });
    }
  });

  app.get("/api/businesses", async (req, res) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create business
  app.post("/api/businesses", async (req, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(businessData);
      res.json(business);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid business data", errors: error.errors });
      } else {
        console.error("Error creating business:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delivery Request Routes
  
  // Get all delivery requests
  app.get("/api/delivery-requests", async (req, res) => {
    try {
      const deliveries = await storage.getDeliveryRequests();
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching delivery requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create delivery request
  app.post("/api/delivery-requests", async (req, res) => {
    try {
      const { userId, isPaid, paymentId, paymentStatus, totalAmount, ...deliveryData } = req.body;
      
      let validatedData;
      if (userId) {
        // Authenticated user request
        validatedData = insertDeliveryRequestAuthenticatedSchema.parse({ userId, ...deliveryData });
      } else {
        // Guest request
        validatedData = insertDeliveryRequestGuestSchema.parse(deliveryData);
      }
      
      // Add payment information if provided
      const requestData = {
        ...validatedData,
        squarePaymentId: paymentId || null,
        paymentStatus: paymentStatus || 'pending',
        totalAmount: totalAmount || null,
        status: isPaid ? 'paid' : 'pending', // Set status to 'paid' for pre-paid requests
      };
      
      const delivery = await storage.createDeliveryRequest(requestData);
      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid delivery data", errors: error.errors });
      } else {
        console.error("Error creating delivery request:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Check if delivery request can be edited (not paid)
  app.get("/api/delivery-requests/:id/editable", async (req, res) => {
    try {
      const { id } = req.params;
      const delivery = await storage.getDeliveryRequestById(id);
      
      if (!delivery) {
        return res.status(404).json({ message: "Delivery request not found" });
      }
      
      // Can't edit if payment has been processed
      const canEdit = delivery.paymentStatus !== 'paid' && delivery.squarePaymentId === null;
      
      res.json({ canEdit, reason: canEdit ? null : "Cannot edit paid delivery requests" });
    } catch (error) {
      console.error("Error checking editability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update delivery status (admin only)
  app.patch("/api/delivery-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, driverNotes } = updateDeliveryStatusSchema.parse(req.body);
      
      await storage.updateDeliveryStatus(id, status);
      
      // Award loyalty points when delivery is completed (if user exists)
      // Loyalty points temporarily disabled until proper user integration
      
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Driver Routes
  
  // Get available deliveries for drivers
  app.get("/api/driver/deliveries/available", async (req, res) => {
    try {
      const deliveries = await storage.getAvailableDeliveries();
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching available deliveries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get driver's claimed/active deliveries
  app.get("/api/driver/:driverId/deliveries", async (req, res) => {
    try {
      const { driverId } = req.params;
      const deliveries = await storage.getDriverDeliveries(driverId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching driver deliveries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Claim a delivery
  app.post("/api/driver/:driverId/claim", async (req, res) => {
    try {
      const { driverId } = req.params;
      const { deliveryId, driverNotes } = claimDeliverySchema.parse(req.body);
      
      const delivery = await storage.claimDelivery(driverId, deliveryId, driverNotes);
      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error claiming delivery:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Update delivery status for driver
  app.patch("/api/driver/:driverId/deliveries/:deliveryId", async (req, res) => {
    try {
      const { driverId, deliveryId } = req.params;
      const updates = updateDeliveryStatusSchema.parse(req.body);
      
      const delivery = await storage.updateDeliveryForDriver(driverId, deliveryId, updates);
      
      // Award loyalty points when delivery is completed
      if (updates.status === 'completed' && delivery.userId) {
        await storage.updateLoyaltyPoints(delivery.userId, 1, delivery.usedFreeDelivery || false); // 1 point per completed delivery
      }
      
      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid update data", errors: error.errors });
      } else {
        console.error("Error updating delivery:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Update driver duty status
  app.patch("/api/driver/:driverId/status", async (req, res) => {
    try {
      const { driverId } = req.params;
      const updates = updateDriverStatusSchema.parse(req.body);
      
      // If driver is going off duty, release any claimed deliveries back to available
      if (updates.isOnDuty === false) {
        console.log(`Driver ${driverId} going off duty - releasing claimed deliveries`);
        try {
          await storage.releaseDriverDeliveries(driverId);
          console.log(`Released claimed deliveries for driver ${driverId}`);
        } catch (releaseError) {
          console.error("Error releasing driver deliveries:", releaseError);
          // Don't fail the status update if release fails, just log it
        }
      }
      
      // Update driver status in business_staff table
      const staffMember = await storage.getBusinessStaffById(driverId);
      if (!staffMember) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      const updatedStaff = await storage.updateBusinessStaff(driverId, {
        isOnDuty: updates.isOnDuty
      });
      
      res.json({ 
        id: updatedStaff.id, 
        isOnDuty: updatedStaff.isOnDuty,
        role: updatedStaff.role 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status data", errors: error.errors });
      } else {
        console.error("Error updating driver status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Business Settings Routes
  
  // Get admin business settings (full access)
  app.get("/api/admin/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const dbSettings = await storage.getBusinessSettings(tenantId);
      
      if (!dbSettings) {
        // Return default settings for new tenants
        const defaultSettings = {
          tenantId,
          businessName: "Sara's Quickie Delivery",
          businessEmail: "contact@sarasquickiedelivery.com",
          businessPhone: "(641) 673-0123",
          businessAddress: "Oskaloosa, IA",
          primaryColor: "#0369a1",
          secondaryColor: "#64748b",
          accentColor: "#ea580c",
          currency: "USD",
          timezone: "America/Chicago",
          deliveryPricing: {
            basePrice: 3.00,
            pricePerMile: 1.50,
            minimumOrder: 10.00,
            rushDeliveryMultiplier: 1.5,
            freeDeliveryThreshold: 50.00
          },
          loyaltyProgram: {
            deliveriesForFreeDelivery: 10
          },
          distanceSettings: {
            baseFeeRadius: 10.0
          },
          businessHours: {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '10:00', close: '16:00', closed: false },
            sunday: { open: '12:00', close: '16:00', closed: true }
          },
          acceptedPaymentMethods: ['cash_on_delivery', 'card_on_delivery', 'online_payment']
        };
        return res.json(defaultSettings);
      }
      
      const settings = {
        id: dbSettings.id,
        tenantId: dbSettings.tenantId,
        businessName: dbSettings.businessName || "Sara's Quickie Delivery",
        businessEmail: dbSettings.businessEmail || "contact@sarasquickiedelivery.com",
        businessPhone: dbSettings.businessPhone || "(641) 673-0123",
        businessAddress: dbSettings.businessAddress || "Oskaloosa, IA",
        logoUrl: dbSettings.logoUrl,
        primaryColor: dbSettings.primaryColor || "#0369a1",
        secondaryColor: dbSettings.secondaryColor || "#64748b",
        accentColor: dbSettings.accentColor || "#ea580c",
        currency: dbSettings.currency || "USD",
        timezone: dbSettings.timezone || "America/Chicago",
        businessHours: dbSettings.operatingHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '12:00', close: '16:00', closed: true }
        },
        deliveryPricing: {
          basePrice: parseFloat(dbSettings.baseDeliveryFee) || 3.00,
          pricePerMile: parseFloat(dbSettings.pricePerMile) || 1.50,
          minimumOrder: parseFloat(dbSettings.minimumOrderValue) || 10.00,
          freeDeliveryThreshold: parseFloat(dbSettings.freeDeliveryThreshold) || 50.00,
          rushDeliveryMultiplier: parseFloat(dbSettings.rushDeliveryMultiplier) || 1.5
        },
        loyaltyProgram: {
          deliveriesForFreeDelivery: dbSettings.pointsForFreeDelivery || 10
        },
        distanceSettings: {
          baseFeeRadius: parseFloat(dbSettings.baseFeeRadius) || 10.0
        },
        notifications: {
          emailNotifications: dbSettings.customerNotifications?.email ?? true,
          smsNotifications: dbSettings.customerNotifications?.sms ?? false,
          customerUpdates: true,
          driverAlerts: true
        },
        features: {
          loyaltyProgram: dbSettings.enableLoyaltyProgram ?? true,
          realTimeTracking: dbSettings.enableRealTimeTracking ?? true,
          scheduledDeliveries: dbSettings.enableScheduledDeliveries ?? false,
          multiplePaymentMethods: true
        },
        // Removed: Google Reviews feature
        squareSettings: {
          accessToken: dbSettings.squareAccessToken ? '***' : undefined,
          applicationId: dbSettings.squareApplicationId,
          locationId: dbSettings.squareLocationId,
          environment: dbSettings.squareEnvironment || 'sandbox',
          configured: !!(dbSettings.squareAccessToken && dbSettings.squareApplicationId && dbSettings.squareLocationId)
        },
        acceptedPaymentMethods: dbSettings.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment'],
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching business settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update business settings
  app.put("/api/admin/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      
      // Transform form schema to database fields
      const formData = req.body;
      const dbData = {
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessPhone: formData.businessPhone,
        businessAddress: formData.businessAddress,
        logoUrl: formData.logoUrl,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: formData.accentColor,
        currency: formData.currency,
        timezone: formData.timezone,
        operatingHours: formData.businessHours,
        baseDeliveryFee: formData.deliveryPricing?.basePrice?.toString() || "5.00",
        pricePerMile: formData.deliveryPricing?.pricePerMile?.toString() || "1.50",
        minimumOrderValue: formData.deliveryPricing?.minimumOrder?.toString() || "10.00",
        rushDeliveryMultiplier: formData.deliveryPricing?.rushDeliveryMultiplier?.toString() || "1.5",
        urgentDeliveryFee: formData.deliveryPricing?.basePrice ? 
          (parseFloat(formData.deliveryPricing.basePrice) + 5.00).toString() : 
          "10.00",
        freeDeliveryThreshold: formData.deliveryPricing?.freeDeliveryThreshold?.toString() || "50.00",
        pointsForFreeDelivery: formData.loyaltyProgram?.deliveriesForFreeDelivery || 10,
        baseFeeRadius: formData.distanceSettings?.baseFeeRadius?.toString() || "10.00",
        customerNotifications: {
          email: formData.notifications?.emailNotifications ?? true,
          sms: formData.notifications?.smsNotifications ?? false,
          push: false
        },
        enableLoyaltyProgram: formData.features?.loyaltyProgram ?? true,
        enableRealTimeTracking: formData.features?.realTimeTracking ?? true,
        enableScheduledDeliveries: formData.features?.scheduledDeliveries ?? false,
        // Removed: Google Reviews fields
        squareAccessToken: formData.squareSettings?.accessToken === '***' ? undefined : formData.squareSettings?.accessToken,
        squareApplicationId: formData.squareSettings?.applicationId,
        squareLocationId: formData.squareSettings?.locationId,
        squareEnvironment: formData.squareSettings?.environment || 'sandbox',
        acceptedPaymentMethods: formData.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment']
      };
      
      const dbSettings = await storage.updateBusinessSettings(tenantId, dbData);
      
      // Google Reviews configuration saved (simplified - no auto-fetching)
      
      // Return transformed data matching GET endpoint format
      const transformedSettings = {
        id: dbSettings.id,
        tenantId: dbSettings.tenantId,
        businessName: dbSettings.businessName || "Sara's Quickie Delivery",
        businessEmail: dbSettings.businessEmail || "contact@sarasquickiedelivery.com",
        businessPhone: dbSettings.businessPhone || "(641) 673-0123",
        businessAddress: dbSettings.businessAddress || "Oskaloosa, IA",
        logoUrl: dbSettings.logoUrl,
        primaryColor: dbSettings.primaryColor || "#0369a1",
        secondaryColor: dbSettings.secondaryColor || "#64748b",
        accentColor: dbSettings.accentColor || "#ea580c",
        currency: dbSettings.currency || "USD",
        timezone: dbSettings.timezone || "America/Chicago",
        businessHours: dbSettings.operatingHours || formData.businessHours,
        deliveryPricing: {
          basePrice: parseFloat(dbSettings.baseDeliveryFee) || 3.00,
          pricePerMile: parseFloat(dbSettings.pricePerMile) || 1.50,
          minimumOrder: parseFloat(dbSettings.minimumOrderValue) || 10.00,
          freeDeliveryThreshold: parseFloat(dbSettings.freeDeliveryThreshold) || 50.00,
          rushDeliveryMultiplier: parseFloat(dbSettings.rushDeliveryMultiplier) || 1.5
        },
        loyaltyProgram: {
          deliveriesForFreeDelivery: dbSettings.pointsForFreeDelivery || 10
        },
        distanceSettings: {
          baseFeeRadius: parseFloat(dbSettings.baseFeeRadius) || 10.0
        },
        notifications: {
          emailNotifications: dbSettings.customerNotifications?.email ?? true,
          smsNotifications: dbSettings.customerNotifications?.sms ?? false,
          customerUpdates: true,
          driverAlerts: true
        },
        features: {
          loyaltyProgram: dbSettings.enableLoyaltyProgram ?? true,
          realTimeTracking: dbSettings.enableRealTimeTracking ?? true,
          scheduledDeliveries: dbSettings.enableScheduledDeliveries ?? false,
          multiplePaymentMethods: true
        },
        // Removed: Google Reviews feature
        squareSettings: {
          accessToken: dbSettings.squareAccessToken ? '***' : undefined,
          applicationId: dbSettings.squareApplicationId,
          locationId: dbSettings.squareLocationId,
          environment: dbSettings.squareEnvironment || 'sandbox',
          configured: !!(dbSettings.squareAccessToken && dbSettings.squareApplicationId && dbSettings.squareLocationId)
        },
        acceptedPaymentMethods: dbSettings.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment'],
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };
      
      res.json(transformedSettings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Square Settings Endpoint
  app.post("/api/admin/square-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      // Debug logging
      console.log("=== SQUARE SETTINGS DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Access token received:", req.body.squareAccessToken ? `[${req.body.squareAccessToken.length} chars]` : 'undefined');
      
      // Validate the Square settings data
      const { squareAccessToken, squareApplicationId, squareLocationId, squareEnvironment } = req.body;
      
      if (!squareAccessToken || !squareApplicationId || !squareLocationId) {
        return res.status(400).json({ 
          success: false, 
          error: "All Square fields are required: access token, application ID, and location ID" 
        });
      }

      // Update only the Square-related fields in business settings
      const updateData = {
        squareAccessToken,
        squareApplicationId,  
        squareLocationId,
        squareEnvironment: squareEnvironment || 'sandbox'
      };
      
      const dbSettings = await storage.updateBusinessSettings(tenantId, updateData);
      
      res.json({
        success: true,
        message: "Square settings updated successfully",
        settings: {
          squareApplicationId: dbSettings.squareApplicationId,
          squareLocationId: dbSettings.squareLocationId,
          squareEnvironment: dbSettings.squareEnvironment,
          accessTokenSaved: !!dbSettings.squareAccessToken
        }
      });
    } catch (error) {
      console.error("Error updating Square settings:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update Square settings" 
      });
    }
  });

  // Get public business settings (subset of admin settings)
  app.get("/api/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      // Check if this is the main marketing site - it shouldn't fetch business settings
      if ((req as any).isMainSite) {
        return res.status(404).json({ message: "Business settings not available for marketing site" });
      }

      // Try to get business settings with proper error handling
      let dbSettings;
      try {
        dbSettings = await storage.getBusinessSettings(tenantId);
      } catch (error) {
        console.error("Business settings database error:", error);
        
        // Return error instead of defaulting to Sara's data - this prevents data leakage
        return res.status(404).json({ 
          message: "Business settings not found for this tenant. Please configure your business settings first.",
          requiresSetup: true
        });
      }
      
      if (!dbSettings) {
        // No settings found for this tenant - they need to set up their business
        console.log("No business settings found for tenant:", tenantId);
        return res.status(404).json({ 
          message: "Business settings not configured for this tenant. Please complete your business setup.",
          requiresSetup: true
        });
      }
      
      // Return public business settings (subset of admin settings)
      const publicSettings = {
        businessName: dbSettings.businessName || "Sara's Quickie Delivery",
        businessPhone: dbSettings.businessPhone || "(641) 673-0123",
        businessEmail: dbSettings.businessEmail || "contact@sarasquickiedelivery.com",
        businessAddress: dbSettings.businessAddress || "1004 A Ave E, Oskaloosa, IA 52577",
        primaryColor: dbSettings.primaryColor || "#0369a1",
        secondaryColor: dbSettings.secondaryColor || "#64748b",
        accentColor: dbSettings.accentColor || "#ea580c",
        logoUrl: dbSettings.logoUrl,
        features: {
          loyaltyProgram: dbSettings.enableLoyaltyProgram ?? true,
          scheduledDeliveries: dbSettings.enableScheduledDeliveries ?? false
        },
        deliveryPricing: {
          basePrice: parseFloat(dbSettings.baseDeliveryFee) || 3.00,
          pricePerMile: parseFloat(dbSettings.pricePerMile) || 1.50,
          minimumOrder: parseFloat(dbSettings.minimumOrderValue) || 10.00,
          freeDeliveryThreshold: parseFloat(dbSettings.freeDeliveryThreshold) || 50.00
        },
        distanceSettings: {
          baseFeeRadius: parseFloat(dbSettings.baseFeeRadius) || 10.0
        },
        acceptedPaymentMethods: dbSettings.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment'],
        businessHours: dbSettings.operatingHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '12:00', close: '16:00', closed: true }
        }
      };
      
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public business settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current tenant information
  app.get("/api/tenant", async (req, res) => {
    try {
      const tenant = getCurrentTenant(req);
      const isMainSite = (req as any).isMainSite || false;
      
      res.json({
        ...tenant,
        isMainSite
      });
    } catch (error) {
      console.error('Error fetching tenant info:', error);
      res.status(500).json({ message: "Error fetching tenant information" });
    }
  });

  // Combined Business Signup Route
  app.post("/api/signup/combined", async (req, res) => {
    try {
      const validatedData = combinedBusinessSignupSchema.parse(req.body);
      
      // Generate subdomain from business name
      const subdomain = validatedData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if subdomain is available
      const isAvailable = await storage.checkSubdomainAvailable(subdomain, validatedData.email);
      if (!isAvailable) {
        return res.status(400).json({ 
          message: "A business with a similar name already exists. Please choose a different business name." 
        });
      }

      // Create verification token
      const crypto = await import('crypto');
      const verificationToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store signup data including admin password
      const signupData = {
        ...validatedData,
        subdomain,
        verificationToken,
      };

      try {
        await storage.createPendingSignup({
          email: validatedData.email,
          signupData: signupData as any,
          verificationToken,
          expiresAt,
        });
      } catch (error: any) {
        // Handle duplicate email case
        if (error.code === '23505' && error.constraint === 'pending_signups_email_key') {
          return res.status(400).json({ 
            message: "An account with this email is already pending verification. Please check your email or wait for the previous signup to expire." 
          });
        }
        throw error; // Re-throw other errors
      }

      // Construct proper redirect URL - handle both development and production
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      
      // For production, ensure we use the proper domain with HTTPS
      let redirectHost = host;
      let redirectProtocol = protocol;
      
      if (process.env.NODE_ENV === 'production' || host.includes('alltowndelivery.com')) {
        redirectHost = 'www.alltowndelivery.com';
        redirectProtocol = 'https';
      }
      
      const redirectUrl = `${redirectProtocol}://${redirectHost}/signup-complete?token=${verificationToken}`;
      console.log('Production signup - Host:', host, 'Protocol:', protocol, 'NODE_ENV:', process.env.NODE_ENV);
      console.log('Final email redirect URL:', redirectUrl);
      
      // Send verification email through Supabase with business data in metadata
      const { error } = await supabaseClient.auth.signUp({
        email: validatedData.email,
        password: validatedData.adminPassword, // Use admin password for Supabase auth
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.ownerName,
            business_name: validatedData.businessName,
            subdomain: subdomain,
            signupType: 'business',
            businessData: signupData // Store complete business data for fallback
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        await storage.deletePendingSignup(verificationToken);
        return res.status(400).json({ message: error.message });
      }

      res.status(200).json({ 
        message: "Verification email sent successfully",
        subdomain: subdomain
      });

    } catch (error) {
      console.error("Combined signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email verification endpoint for custom token flow
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Get pending signup data
      const pendingSignup = await storage.getPendingSignup(token);
      if (!pendingSignup) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Check if token is expired
      if (new Date() > pendingSignup.expiresAt) {
        await storage.deletePendingSignup(token);
        return res.status(400).json({ message: "Verification token has expired" });
      }

      const signupData = pendingSignup.signupData as any;
      
      // Create tenant and business settings
      const newTenant = await storage.createTenant({
        subdomain: signupData.subdomain,
        companyName: signupData.businessName,
        businessType: signupData.businessType,
        ownerName: signupData.ownerName,
        email: signupData.email,
        phone: signupData.phone,
        businessAddress: signupData.businessAddress,
        city: signupData.city,
        state: signupData.state,
        zipCode: signupData.zipCode,
        currentDeliveryVolume: signupData.currentDeliveryVolume,
        description: signupData.description,
      });

      // Create admin user
      const adminUser = await storage.createUser({
        username: signupData.email,
        password: signupData.adminPassword,
        name: signupData.ownerName,
        role: 'admin' as const,
        phone: signupData.phone,
        tenantId: newTenant.id,
      });

      // Create default business settings
      const defaultBusinessSettings = {
        businessName: signupData.businessName,
        businessType: signupData.businessType,
        businessAddress: signupData.businessAddress,
        phone: signupData.phone,
        email: signupData.email,
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '15:00', closed: false },
          sunday: { open: '10:00', close: '15:00', closed: true }
        },
        deliveryRadius: 15,
        minimumOrder: 0,
        deliveryFee: 5.99,
        loyaltyProgram: {
          enabled: true,
          freeDeliveryAfter: 10
        },
        tenantId: newTenant.id,
      };

      await storage.createBusinessSettings(defaultBusinessSettings);

      // Clean up pending signup
      await storage.deletePendingSignup(token);

      res.status(200).json({
        message: "Email verified and account created successfully",
        subdomain: signupData.subdomain,
        tenantId: newTenant.id
      });

    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Direct business account creation (no email verification complexity)
  app.post("/api/signup/direct", async (req, res) => {
    try {
      const validatedData = combinedBusinessSignupSchema.parse(req.body);
      
      // Generate subdomain from business name
      const subdomain = validatedData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Use the provided username (cleaned for safety)
      const username = validatedData.adminUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      


      // Check if subdomain is available
      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      if (existingTenant) {
        return res.status(400).json({ 
          message: "A business with a similar name already exists. Please choose a different business name." 
        });
      }

      // Create tenant directly
      const newTenant = await storage.createTenant({
        subdomain: subdomain,
        companyName: validatedData.businessName,
        businessType: validatedData.businessType,
        ownerName: validatedData.ownerName,
        email: validatedData.email,
        phone: validatedData.phone,
        businessAddress: validatedData.businessAddress,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        currentDeliveryVolume: validatedData.currentDeliveryVolume,
        description: validatedData.description,
      });

      // Create admin user in base user_profiles table
      const adminUserId = crypto.randomUUID(); // Will be replaced with actual Supabase user ID
      const adminUserProfile = await storage.createUserProfile({
        id: adminUserId,
        email: validatedData.email,
        fullName: validatedData.ownerName,
        phone: validatedData.phone,
        tenantId: newTenant.id,
      });

      // Create Supabase user for business authentication
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.adminPassword,
        user_metadata: {
          full_name: validatedData.ownerName,
          phone: validatedData.phone,
          business_role: 'admin',
          tenant_id: newTenant.id,
          business_name: validatedData.businessName
        },
        email_confirm: true // Auto-confirm for business accounts
      });

      if (authError || !authUser.user) {
        throw new Error(`Failed to create Supabase user: ${authError?.message}`);
      }

      // Use the actual Supabase user ID
      const actualUserId = authUser.user.id;



      // Create admin staff record in business_staff table
      const adminStaffRecord = await storage.createBusinessStaff({
        tenantId: newTenant.id,
        role: 'admin' as const,
        inviteStatus: 'accepted' as const, // Pre-accepted since they created the business
        acceptedAt: new Date(),
        permissions: {
          canInviteStaff: true,
          canManageSettings: true,
          canViewReports: true,
          canManagePayments: true
        }
      }, actualUserId);

      // Create default business settings
      const defaultBusinessSettings = {
        businessName: validatedData.businessName,
        businessType: validatedData.businessType,
        businessAddress: validatedData.businessAddress,
        phone: validatedData.phone,
        email: validatedData.email,
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '15:00', closed: false },
          sunday: { open: '10:00', close: '15:00', closed: true }
        },
        deliveryRadius: 15,
        minimumOrder: 0,
        deliveryFee: 5.99,
        loyaltyProgram: {
          enabled: true,
          freeDeliveryAfter: 10
        },
        tenantId: newTenant.id,
      };

      await storage.createBusinessSettings(defaultBusinessSettings);

      res.status(200).json({ 
        message: "Account created successfully! You can now access your business dashboard.",
        subdomain: subdomain,
        username: username,
        adminEmail: validatedData.email,
        tenantId: newTenant.id,
        userId: actualUserId
      });

    } catch (error) {
      console.error("Direct signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid form data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business login endpoint (Supabase Auth)
  app.post("/api/auth/business-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = authData.user;

      // Check if user has business role by looking up business_staff record
      const staffMember = await storage.getBusinessStaffById(user.id);
      if (!staffMember || !['admin', 'driver', 'dispatcher'].includes(staffMember.role)) {
        return res.status(403).json({ message: "Access denied. Business account required." });
      }

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          role: staffMember.role,
          tenantId: staffMember.tenantId
        },
        session: authData.session
      });
      
    } catch (error) {
      console.error("Business login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  // Account creation from Supabase user metadata (after email verification)
  app.post("/api/tenants/create-from-supabase", async (req, res) => {
    try {
      const { user } = req.body;
      
      if (!user || !user.user_metadata) {
        return res.status(400).json({ 
          message: "Invalid user data" 
        });
      }

      const metadata = user.user_metadata;
      
      // Create tenant from metadata
      const newTenant = await storage.createTenant({
        subdomain: metadata.subdomain,
        companyName: metadata.businessName,
        businessType: metadata.businessType,
        ownerName: metadata.ownerName,
        email: user.email,
        phone: metadata.phone,
        businessAddress: metadata.businessAddress,
        city: metadata.city,
        state: metadata.state,
        zipCode: metadata.zipCode,
        currentDeliveryVolume: metadata.currentDeliveryVolume,
        description: metadata.description,
      });

      // Create admin user profile
      const adminUser = await storage.createUser({
        username: user.email,
        password: 'managed_by_supabase', // Password managed by Supabase
        name: metadata.ownerName,
        role: 'admin' as const,
        phone: metadata.phone,
        tenantId: newTenant.id,
      });

      // Create default business settings based on business type
      const defaultBusinessSettings = {
        businessName: metadata.businessName,
        businessType: metadata.businessType,
        businessAddress: metadata.businessAddress,
        phone: metadata.phone,
        email: user.email,
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '15:00', closed: false },
          sunday: { open: '10:00', close: '15:00', closed: true }
        },
        deliveryRadius: 15,
        minimumOrder: 0,
        deliveryFee: 5.99,
        loyaltyProgram: {
          enabled: true,
          freeDeliveryAfter: 10
        },
        tenantId: newTenant.id,
      };

      await storage.createBusinessSettings(defaultBusinessSettings);

      res.status(200).json({
        message: "Account created successfully!",
        subdomain: metadata.subdomain,
        tenantId: newTenant.id
      });

    } catch (error) {
      console.error("Account creation error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Tenant signup endpoint
  app.post("/api/tenants/signup", async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      
      // Check if subdomain is available
      const existingTenant = await storage.getTenantBySubdomain(validatedData.subdomain!);
      if (existingTenant) {
        return res.status(400).json({ 
          message: "Subdomain already taken",
          field: "subdomain"
        });
      }

      // Calculate trial end date (30 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      // Create tenant
      const newTenant = await storage.createTenant({
        ...validatedData,
        trialEndDate,
        planType: "trial",
        billingStatus: "trial"
      });

      // Create business type-specific default settings
      const getDefaultSettingsByType = (businessType: string) => {
        const baseSettings = {
          tenantId: newTenant.id,
          businessName: validatedData.companyName,
          businessPhone: validatedData.phone,
          businessEmail: validatedData.email,
          businessAddress: validatedData.businessAddress,
          primaryColor: validatedData.primaryColor || "#0369a1",
        };

        switch (businessType) {
          case 'Multi-Service Delivery':
            return {
              ...baseSettings,
              baseDeliveryFee: "4.99",
              freeDeliveryThreshold: "25.00",
              operatingHours: {
                monday: { open: '08:00', close: '20:00', closed: false },
                tuesday: { open: '08:00', close: '20:00', closed: false },
                wednesday: { open: '08:00', close: '20:00', closed: false },
                thursday: { open: '08:00', close: '20:00', closed: false },
                friday: { open: '08:00', close: '20:00', closed: false },
                saturday: { open: '08:00', close: '20:00', closed: false },
                sunday: { open: '10:00', close: '18:00', closed: false }
              },
              pointsForFreeDelivery: 10,
              enableLoyaltyProgram: true,
              enableRealTimeTracking: true,
            };

          case 'Restaurant Delivery Only':
            return {
              ...baseSettings,
              baseDeliveryFee: "3.99",
              freeDeliveryThreshold: "20.00",
              operatingHours: {
                monday: { open: '11:00', close: '22:00', closed: false },
                tuesday: { open: '11:00', close: '22:00', closed: false },
                wednesday: { open: '11:00', close: '22:00', closed: false },
                thursday: { open: '11:00', close: '22:00', closed: false },
                friday: { open: '11:00', close: '23:00', closed: false },
                saturday: { open: '11:00', close: '23:00', closed: false },
                sunday: { open: '12:00', close: '21:00', closed: false }
              },
              pointsForFreeDelivery: 8,
              enableLoyaltyProgram: true,
              enableRealTimeTracking: true,
            };

          case 'Pharmacy Delivery Only':
            return {
              ...baseSettings,
              baseDeliveryFee: "5.99",
              freeDeliveryThreshold: "30.00",
              operatingHours: {
                monday: { open: '09:00', close: '19:00', closed: false },
                tuesday: { open: '09:00', close: '19:00', closed: false },
                wednesday: { open: '09:00', close: '19:00', closed: false },
                thursday: { open: '09:00', close: '19:00', closed: false },
                friday: { open: '09:00', close: '19:00', closed: false },
                saturday: { open: '09:00', close: '17:00', closed: false },
                sunday: { open: '10:00', close: '16:00', closed: false }
              },
              pointsForFreeDelivery: 12,
              enableLoyaltyProgram: true,
              enableRealTimeTracking: true,
            };

          default:
            return {
              ...baseSettings,
              baseDeliveryFee: "4.99",
              freeDeliveryThreshold: "25.00",
              operatingHours: {
                monday: { open: '08:00', close: '20:00', closed: false },
                tuesday: { open: '08:00', close: '20:00', closed: false },
                wednesday: { open: '08:00', close: '20:00', closed: false },
                thursday: { open: '08:00', close: '20:00', closed: false },
                friday: { open: '08:00', close: '20:00', closed: false },
                saturday: { open: '08:00', close: '20:00', closed: false },
                sunday: { open: '10:00', close: '18:00', closed: false }
              },
              pointsForFreeDelivery: 10,
              enableLoyaltyProgram: true,
              enableRealTimeTracking: true,
            };
        }
      };

      const defaultSettings = getDefaultSettingsByType(validatedData.businessType || 'Multi-Service Delivery');
      await storage.createBusinessSettings(defaultSettings);

      res.status(201).json({
        success: true,
        tenant: newTenant,
        subdomain: validatedData.subdomain,
        trialEndsAt: trialEndDate.toISOString(),
      });
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ 
        message: "Failed to create account",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate subdomain suggestion from business name
  app.post("/api/tenants/suggest-subdomain", async (req, res) => {
    try {
      const { businessName } = req.body;
      
      if (!businessName) {
        return res.status(400).json({ error: "Business name is required" });
      }

      // Generate base subdomain from business name
      const generateSubdomain = (name: string): string => {
        return name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      };

      let suggestedSubdomain = generateSubdomain(businessName);
      let counter = 1;
      let isAvailable = false;

      // Check availability and add number if needed
      while (!isAvailable && counter <= 10) {
        const testSubdomain = counter === 1 ? suggestedSubdomain : `${suggestedSubdomain}-${counter}`;
        
        if (testSubdomain.length >= 3 && testSubdomain.length <= 20) {
          const existingTenant = await storage.getTenantBySubdomain(testSubdomain);
          
          if (!existingTenant) {
            suggestedSubdomain = testSubdomain;
            isAvailable = true;
          }
        }
        
        counter++;
      }

      res.json({
        suggested: suggestedSubdomain,
        available: isAvailable
      });
    } catch (error) {
      console.error("Error generating subdomain suggestion:", error);
      res.status(500).json({ error: "Error generating subdomain" });
    }
  });

  // Check subdomain availability
  app.post("/api/tenants/check-subdomain", async (req, res) => {
    try {
      const { subdomain } = req.body;
      
      if (!subdomain || subdomain.length < 3) {
        return res.status(400).json({ 
          message: "Subdomain must be at least 3 characters" 
        });
      }

      const existingTenant = await storage.getTenantBySubdomain(subdomain);
      
      res.json({ 
        available: !existingTenant,
        subdomain 
      });
    } catch (error) {
      console.error("Error checking subdomain:", error);
      res.status(500).json({ 
        message: "Failed to check subdomain availability" 
      });
    }
  });

  // Google Maps API Routes
  
  // Calculate distance between two addresses
  app.post("/api/maps/calculate-distance", async (req, res) => {
    try {
      const { pickup, delivery } = req.body;
      
      if (!pickup || !delivery) {
        return res.status(400).json({ 
          message: "Both pickup and delivery addresses are required" 
        });
      }

      const result = await googleMapsService.calculateDistance(pickup, delivery);
      res.json(result);
    } catch (error) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ 
        message: "Failed to calculate distance",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validate an address
  app.post("/api/maps/validate-address", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ 
          message: "Address is required" 
        });
      }

      const result = await googleMapsService.validateAddress(address);
      res.json(result);
    } catch (error) {
      console.error("Error validating address:", error);
      res.status(500).json({ 
        message: "Failed to validate address",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Calculate delivery fee with distance
  app.post("/api/maps/calculate-delivery-fee", async (req, res) => {
    try {
      const { pickup, delivery, isRush = false } = req.body;
      
      if (!pickup || !delivery) {
        return res.status(400).json({ 
          message: "Both pickup and delivery addresses are required" 
        });
      }

      // Get business settings for pricing
      const tenantId = getCurrentTenantId(req);
      const businessSettings = await storage.getBusinessSettings(tenantId);
      
      if (!businessSettings) {
        return res.status(404).json({ message: "Business settings not found" });
      }

      // Calculate distance
      const distanceResult = await googleMapsService.calculateDistance(pickup, delivery);
      
      if (distanceResult.status !== 'OK') {
        return res.status(400).json({
          message: "Could not calculate distance",
          error: distanceResult.errorMessage
        });
      }

      // Calculate delivery fee
      const deliveryFee = googleMapsService.calculateDeliveryFee(
        distanceResult.distance,
        {
          baseDeliveryFee: parseFloat(businessSettings.baseDeliveryFee) || 3.00,
          pricePerMile: parseFloat(businessSettings.pricePerMile) || 1.50,
          baseFeeRadius: parseFloat(businessSettings.baseFeeRadius) || 10.0,
          rushDeliveryMultiplier: parseFloat(businessSettings.rushDeliveryMultiplier) || 1.5
        },
        isRush
      );

      res.json({
        distance: distanceResult.distance,
        duration: distanceResult.duration,
        deliveryFee: deliveryFee,
        isWithinBaseRadius: distanceResult.distance <= (parseFloat(businessSettings.baseFeeRadius) || 10.0),
        pricing: {
          baseFee: parseFloat(businessSettings.baseDeliveryFee) || 3.00,
          pricePerMile: parseFloat(businessSettings.pricePerMile) || 1.50,
          baseFeeRadius: parseFloat(businessSettings.baseFeeRadius) || 10.0,
          extraMiles: Math.max(0, distanceResult.distance - (parseFloat(businessSettings.baseFeeRadius) || 10.0))
        }
      });
    } catch (error) {
      console.error("Error calculating delivery fee:", error);
      res.status(500).json({ 
        message: "Failed to calculate delivery fee",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Service Zones API Routes
  
  // Get service zones for tenant
  app.get("/api/admin/service-zones", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const zones = await storage.getServiceZones(tenantId);
      res.json(zones);
    } catch (error) {
      console.error("Error fetching service zones:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create service zone
  app.post("/api/admin/service-zones", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const zone = await storage.createServiceZone({ ...req.body, tenantId });
      res.json(zone);
    } catch (error) {
      console.error("Error creating service zone:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update service zone
  app.put("/api/admin/service-zones/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const zone = await storage.updateServiceZone(id, req.body);
      res.json(zone);
    } catch (error) {
      console.error("Error updating service zone:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete service zone
  app.delete("/api/admin/service-zones/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteServiceZone(id);
      res.json({ message: "Service zone deleted successfully" });
    } catch (error) {
      console.error("Error deleting service zone:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Object upload endpoint  
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getLogoUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // This endpoint is used to serve public assets.
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Removed: Google Reviews functionality - table dropped

  // Search Google Places for Place ID (admin helper)
  app.post("/api/admin/google-places/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const googlePlaces = new GooglePlacesService();
      const results = await googlePlaces.searchPlace(query);
      
      res.json({ results });
    } catch (error) {
      console.error("Error searching Google Places:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Removed: Google Reviews auto-fetch functionality

  // Removed: Manual refresh reviews endpoint - Google Reviews functionality disabled

  app.post("/api/payments/:paymentId/refund", async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid refund amount is required" });
      }

      // Square integration temporarily disabled
      return res.status(400).json({ 
        success: false, 
        error: "Refund processing temporarily unavailable" 
      });
    } catch (error: any) {
      console.error("Refund processing error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Refund processing failed" 
      });
    }
  });

  // Dispatch routes
  app.use('/api/dispatch', dispatchRoutes);

  // Debug route to test database connection
  app.get("/api/debug/database", async (req, res) => {
    try {
      console.log("=== DATABASE CONNECTION DEBUG ===");
      
      // Clear cache and test connection directly
      storage.dbStorage.clearConnectionCache();
      
      // Test direct db query  
      const dbModule = await import("./db.js");
      const drizzleModule = await import("drizzle-orm");
      const { db } = dbModule;
      const { sql } = drizzleModule;
      
      const result = await db.execute(sql`SELECT NOW() as current_time, 1 as test_value`);
      console.log("Direct DB query successful:", result);
      
      // Test storage layer
      const deliveryRequests = await storage.getDeliveryRequests();
      console.log("Storage layer successful, delivery requests count:", deliveryRequests.length);
      
      res.json({
        success: true,
        direct_query: result,
        storage_test: `Retrieved ${deliveryRequests.length} delivery requests`,
        message: "Database connection working!"
      });
      
    } catch (error) {
      console.error("Database debug failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Database connection failed"
      });
    }
  });

  // Admin routes
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}