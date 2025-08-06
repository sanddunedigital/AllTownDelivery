import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import dispatchRoutes from "./dispatch-routes";
import adminRoutes from "./admin-routes";
import { getCurrentTenant, getCurrentTenantId } from "./tenant";
import { 
  insertDeliveryRequestSchema, 
  insertUserProfileSchema, 
  updateUserProfileSchema,
  insertDeliveryRequestGuestSchema,
  insertDeliveryRequestAuthenticatedSchema,
  claimDeliverySchema,
  updateDeliveryStatusSchema,
  updateDriverStatusSchema,
  insertBusinessSchema
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { googleMapsService } from "./googleMaps";

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
  
  // Get user profile (create if needed)
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      let profile = await storage.getUserProfile(id);
      
      // Create profile if it doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          id,
          email: '', // Will be updated when user provides email
          fullName: null,
          phone: null,
          defaultPickupAddress: null,
          defaultDeliveryAddress: null,
          preferredPaymentMethod: null,
          marketingConsent: false
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create user profile (called after Supabase Auth signup)
  app.post("/api/users/profile", async (req, res) => {
    try {
      const validatedData = insertUserProfileSchema.parse(req.body);
      const profile = await storage.createUserProfile(validatedData);
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
  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateUserProfileSchema.parse(req.body);
      const profile = await storage.updateUserProfile(id, validatedData);
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

  // Check loyalty eligibility (create profile if needed)
  app.get("/api/users/:id/loyalty", async (req, res) => {
    try {
      const { id } = req.params;
      let profile = await storage.getUserProfile(id);
      
      // Create profile if it doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          id,
          email: '', // Will be updated when user provides email
          fullName: null,
          phone: null,
          defaultPickupAddress: null,
          defaultDeliveryAddress: null,
          preferredPaymentMethod: null,
          marketingConsent: false
        });
      }
      
      const eligibleForFree = await storage.checkLoyaltyEligibility(id);
      const loyaltyPoints = profile.loyaltyPoints || 0;
      const freeDeliveryCredits = profile.freeDeliveryCredits || 0;
      
      // Calculate deliveries until next free based on loyalty points (not total deliveries)
      const deliveriesUntilNextFree = freeDeliveryCredits > 0 ? 0 : (10 - loyaltyPoints);
      
      res.json({
        loyaltyPoints,
        totalDeliveries: profile.totalDeliveries || 0,
        freeDeliveryCredits,
        eligibleForFreeDelivery: eligibleForFree,
        deliveriesUntilNextFree
      });
    } catch (error) {
      console.error("Error checking loyalty status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business Routes

  // Get all active businesses
  app.get("/api/businesses", async (req, res) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new business (admin endpoint)
  app.post("/api/businesses", async (req, res) => {
    try {
      const validatedData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(validatedData);
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

  // Get business settings for frontend (public endpoint)
  app.get("/api/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const dbSettings = await storage.getBusinessSettings(tenantId);
      
      if (!dbSettings) {
        return res.status(404).json({ message: "Business settings not found" });
      }
      
      // Transform database fields to public settings (same logic as admin endpoint)
      const publicSettings = {
        businessName: dbSettings.businessName,
        businessPhone: dbSettings.businessPhone,
        businessAddress: dbSettings.businessAddress,
        primaryColor: dbSettings.primaryColor,
        secondaryColor: dbSettings.secondaryColor,
        accentColor: dbSettings.accentColor,
        logoUrl: dbSettings.logoUrl,
        businessHours: dbSettings.operatingHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '12:00', close: '16:00', closed: true }
        },
        currency: dbSettings.currency,
        timezone: dbSettings.timezone,
        deliveryPricing: {
          basePrice: parseFloat(dbSettings.baseDeliveryFee) || 5.00,
          pricePerMile: parseFloat(dbSettings.pricePerMile) || 1.50,
          minimumOrder: parseFloat(dbSettings.minimumOrderValue) || 10.00,
          freeDeliveryThreshold: parseFloat(dbSettings.freeDeliveryThreshold) || 50.00,
          rushDeliveryMultiplier: parseFloat(dbSettings.rushDeliveryMultiplier) || 1.5
        },
        features: {
          loyaltyProgram: dbSettings.enableLoyaltyProgram ?? true,
          realTimeTracking: dbSettings.enableRealTimeTracking ?? true,
          scheduledDeliveries: dbSettings.enableScheduledDeliveries ?? false,
          multiplePaymentMethods: true
        }
      };
      
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching business settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delivery Request Routes

  // Create delivery request (supports both guest and authenticated users)
  app.post("/api/delivery-requests", async (req, res) => {
    try {
      const { userId, saveProfile, useStoredPayment, ...requestData } = req.body;
      
      let validatedData;
      let usedFreeDelivery = false;
      
      // Get business settings for pricing calculations
      const tenantId = getCurrentTenantId(req);
      const businessSettings = await storage.getBusinessSettings(tenantId);
      
      if (userId) {
        // Authenticated user request
        validatedData = insertDeliveryRequestAuthenticatedSchema.parse(req.body);
        
        // Check if loyalty program is enabled and user has free delivery credits
        const profile = await storage.getUserProfile(userId);
        if (businessSettings?.features?.loyaltyProgram && profile?.freeDeliveryCredits && profile.freeDeliveryCredits > 0) {
          usedFreeDelivery = true;
          // Reduce free delivery credits by 1
          await storage.updateUserProfile(userId, {
            freeDeliveryCredits: profile.freeDeliveryCredits - 1
          });
        }
        
        // If user wants to save profile data
        if (saveProfile) {
          if (profile) {
            await storage.updateUserProfile(userId, {
              phone: requestData.phone,
              defaultPickupAddress: requestData.pickupAddress,
              defaultDeliveryAddress: requestData.deliveryAddress,
              preferredPaymentMethod: requestData.paymentMethod,
            });
          }
        }
      } else {
        // Guest user request
        validatedData = insertDeliveryRequestGuestSchema.parse(requestData);
      }

      // Calculate delivery fee based on business settings
      let deliveryFee = businessSettings?.deliveryPricing?.basePrice || 5.00;
      
      // Apply distance-based pricing if available
      if (businessSettings?.deliveryPricing?.pricePerMile && requestData.estimatedDistance) {
        deliveryFee += businessSettings.deliveryPricing.pricePerMile * requestData.estimatedDistance;
      }
      
      // Apply rush delivery multiplier if requested
      if (requestData.isRush && businessSettings?.deliveryPricing?.rushDeliveryMultiplier) {
        deliveryFee *= businessSettings.deliveryPricing.rushDeliveryMultiplier;
      }
      
      // Check for free delivery threshold
      if (businessSettings?.deliveryPricing?.freeDeliveryThreshold && 
          requestData.orderTotal >= businessSettings.deliveryPricing.freeDeliveryThreshold) {
        deliveryFee = 0;
      }
      
      // Apply free delivery if user used credit
      if (usedFreeDelivery) {
        deliveryFee = 0;
      }

      // Add the calculated delivery fee and free delivery flag to the request
      const deliveryRequestData = {
        ...validatedData,
        deliveryFee,
        usedFreeDelivery
      };

      const deliveryRequest = await storage.createDeliveryRequest(deliveryRequestData);
      
      res.json(deliveryRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error creating delivery request:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get delivery requests (supports filtering by user)
  app.get("/api/delivery-requests", async (req, res) => {
    try {
      const { userId } = req.query;
      const requests = await storage.getDeliveryRequests(userId as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching delivery requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update delivery status (admin endpoint)
  app.patch("/api/delivery-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Get delivery before updating to check user ID
      const requests = await storage.getDeliveryRequests();
      const delivery = requests.find(r => r.id === id);
      
      await storage.updateDeliveryStatus(id, status);
      
      // Award loyalty points when delivery is completed (only if loyalty program is enabled)
      if (status === 'completed' && delivery?.userId) {
        const tenantId = getCurrentTenantId(req);
        const businessSettings = await storage.getBusinessSettings(tenantId);
        
        if (businessSettings?.features?.loyaltyProgram) {
          await storage.updateLoyaltyPoints(delivery.userId, 1, delivery.usedFreeDelivery || false); // 1 point per completed delivery
        }
      }
      
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
      
      const profile = await storage.updateUserProfile(driverId, updates);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid status data", errors: error.errors });
      } else {
        console.error("Error updating driver status:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Business Settings API Routes
  
  // Get business settings for tenant
  app.get("/api/admin/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const dbSettings = await storage.getBusinessSettings(tenantId);
      
      if (!dbSettings) {
        return res.json(null);
      }
      
      // Transform database fields to form schema
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
        enableScheduledDeliveries: formData.features?.scheduledDeliveries ?? false
      };
      
      const dbSettings = await storage.updateBusinessSettings(tenantId, dbData);
      
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
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };
      
      res.json(transformedSettings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public business settings endpoint (for general app use)
  app.get("/api/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      const dbSettings = await storage.getBusinessSettings(tenantId);
      
      if (!dbSettings) {
        // Return default settings if none found
        const defaultSettings = {
          businessName: "Sara's Quickie Delivery",
          businessPhone: "(641) 673-0123",
          businessEmail: "contact@sarasquickiedelivery.com",
          businessAddress: "1004 A Ave E, Oskaloosa, IA 52577",
          primaryColor: "#0369a1",
          secondaryColor: "#64748b",
          accentColor: "#ea580c",
          logoUrl: null,
          features: {
            loyaltyProgram: true,
            scheduledDeliveries: false
          },
          deliveryPricing: {
            basePrice: 3.00,
            pricePerMile: 1.50,
            minimumOrder: 10.00,
            freeDeliveryThreshold: 50.00
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
          }
        };
        return res.json(defaultSettings);
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

  // Dispatch routes
  app.use('/api/dispatch', dispatchRoutes);

  // Admin routes
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
