import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, SmartStorage } from "./storage";
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
  insertBusinessSchema,
  processPaymentSchema,
  createInvoiceSchema
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { googleMapsService } from "./googleMaps";
import { GooglePlacesService } from "./googlePlaces";
import { db } from "./db";
import { googleReviews, deliveryRequests } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { squareService } from "./squareService";

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
      
      if (!profile) {
        // Create default profile
        const defaultProfile = {
          id,
          name: "New User",
          email: "",
          phone: "",
          address: "",
          isDriver: false,
          isOnDuty: false,
          role: "customer" as const,
          loyaltyPoints: 0,
          totalDeliveries: 0,
          freeDeliveryCredits: 0
        };
        profile = await storage.createUserProfile(defaultProfile);
      }
      
      res.json(profile);
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
      const { userId, ...deliveryData } = req.body;
      
      let validatedData;
      if (userId) {
        // Authenticated user request
        validatedData = insertDeliveryRequestAuthenticatedSchema.parse({ userId, ...deliveryData });
      } else {
        // Guest request
        validatedData = insertDeliveryRequestGuestSchema.parse(deliveryData);
      }
      
      const delivery = await storage.createDeliveryRequest(validatedData);
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

  // Update delivery status (admin only)
  app.patch("/api/delivery-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, driverNotes } = updateDeliveryStatusSchema.parse(req.body);
      
      const delivery = await storage.updateDeliveryStatus(id, status, driverNotes);
      
      // Award loyalty points when delivery is completed
      if (status === 'completed' && delivery.userId) {
        await storage.updateLoyaltyPoints(delivery.userId, 1, delivery.usedFreeDelivery || false); // 1 point per completed delivery
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
          }
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
        googleReviews: {
          placeId: dbSettings.googlePlaceId,
          enabled: dbSettings.enableGoogleReviews ?? false
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
        enableScheduledDeliveries: formData.features?.scheduledDeliveries ?? false,
        googlePlaceId: formData.googleReviews?.placeId,
        enableGoogleReviews: formData.googleReviews?.enabled ?? false
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
        googleReviews: {
          placeId: dbSettings.googlePlaceId,
          enabled: dbSettings.enableGoogleReviews ?? false
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

  // Get public business settings (subset of admin settings)
  app.get("/api/business-settings", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      // Force database connection - don't fall back to memory storage for business settings
      let dbSettings;
      try {
        if (storage instanceof SmartStorage) {
          dbSettings = await storage.dbStorage.getBusinessSettings(tenantId);
        } else {
          dbSettings = await storage.getBusinessSettings(tenantId);
        }
      } catch (error) {
        console.error("Database connection failed for business settings:", error);
        // If database fails, return a temporary error instead of wrong defaults
        return res.status(503).json({ 
          message: "Service temporarily unavailable",
          error: "Database connection issue"
        });
      }
      
      if (!dbSettings) {
        // This should only happen for truly new tenants - not database connection issues
        console.log("No business settings found for tenant:", tenantId);
        const defaultSettings = {
          businessName: "Sara's Quickie Delivery",
          businessPhone: "(641) 673-0123",
          businessEmail: "contact@sarasquickiedelivery.com",
          businessAddress: "1004 A Ave E, Oskaloosa, IA 52577",
          primaryColor: "#0369a1",
          secondaryColor: "#64748b",
          accentColor: "#ea580c",
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

  // Google Reviews Routes
  
  // Get cached reviews for current tenant
  app.get("/api/reviews", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      const reviewsData = await db.query.googleReviews.findFirst({
        where: eq(googleReviews.tenantId, tenantId),
        orderBy: (reviews, { desc }) => [desc(reviews.lastUpdated)]
      });
      
      if (!reviewsData) {
        return res.json({ reviews: [], rating: 0, user_ratings_total: 0, lastUpdated: null });
      }
      
      const firstReview = reviewsData[0];
      res.json({
        ...firstReview.reviewData,
        lastUpdated: firstReview.lastUpdated,
        placeId: firstReview.placeId
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

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

  // Fetch reviews automatically when enabling Google Reviews feature
  async function fetchAndStoreReviews(tenantId: string, placeId: string) {
    console.log(`Auto-fetching Google Reviews for tenant ${tenantId}, place ID: ${placeId}`);
    
    try {
      const googlePlaces = new GooglePlacesService();
      let actualPlaceId = placeId;
      
      // If the place ID looks like a hex ID from Google Maps, try to convert it
      if (placeId.includes('0x')) {
        console.log('Detected hex-based Place ID, attempting conversion...');
        const convertedPlaceId = await googlePlaces.convertHexToPlaceId(placeId);
        if (convertedPlaceId) {
          actualPlaceId = convertedPlaceId;
          console.log(`Converted hex ID to Place ID: ${actualPlaceId}`);
          
          // Update the business settings with the converted Place ID
          try {
            const existingSettings = await storage.getBusinessSettings(tenantId);
            if (existingSettings && existingSettings.googleReviews) {
              await storage.updateBusinessSettings(tenantId, {
                ...existingSettings,
                googleReviews: {
                  ...existingSettings.googleReviews,
                  placeId: convertedPlaceId
                }
              });
              console.log('Updated business settings with converted Place ID');
            }
          } catch (error) {
            console.error('Error updating business settings with converted Place ID:', error);
          }
        } else {
          console.log('Failed to convert hex ID to Place ID');
        }
      }
      
      const reviewData = await googlePlaces.getPlaceReviews(actualPlaceId);
      
      if (!reviewData) {
        console.error("Failed to fetch reviews from Google Places");
        return null;
      }

      // Check if we already have reviews for this tenant
      const existingReviews = await db
        .select()
        .from(googleReviews)
        .where(eq(googleReviews.tenantId, tenantId))
        .limit(1);

      if (existingReviews.length > 0) {
        // Update existing reviews
        await db
          .update(googleReviews)
          .set({
            reviewData: reviewData,
            lastUpdated: new Date(),
            placeId: placeId
          })
          .where(eq(googleReviews.tenantId, tenantId));
      } else {
        // Insert new reviews
        await db
          .insert(googleReviews)
          .values({
            tenantId: tenantId,
            placeId: placeId,
            reviewData: reviewData,
            lastUpdated: new Date()
          });
      }

      console.log(`Successfully stored ${reviewData.reviews.length} reviews with ${reviewData.rating} average rating`);
      return reviewData;
    } catch (error) {
      console.error("Error auto-fetching reviews:", error);
      return null;
    }
  }

  // Manual refresh reviews endpoint (admin helper)
  app.post("/api/admin/reviews/refresh", async (req, res) => {
    try {
      const tenantId = getCurrentTenantId(req);
      
      // Get business settings to check for Google Place ID
      const dbSettings = await storage.getBusinessSettings(tenantId);
      
      if (!dbSettings?.googlePlaceId || !dbSettings?.enableGoogleReviews) {
        return res.status(400).json({ 
          message: "Google Reviews not configured. Please set Place ID and enable in business settings." 
        });
      }

      const reviewData = await fetchAndStoreReviews(tenantId, dbSettings.googlePlaceId);
      
      if (!reviewData) {
        return res.status(500).json({ message: "Failed to fetch reviews from Google Places" });
      }

      res.json({ 
        message: "Reviews updated successfully", 
        reviewCount: reviewData.reviews.length,
        rating: reviewData.rating 
      });
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Square Payment Routes
  app.post("/api/payments/process", async (req, res) => {
    try {
      const validatedData = processPaymentSchema.parse(req.body);
      const tenantId = getCurrentTenantId(req);

      // Process payment with Square
      const paymentResult = await squareService.processPayment({
        paymentToken: validatedData.paymentToken,
        amount: Math.round(validatedData.amount * 100), // Convert to cents
        currency: validatedData.currency,
        description: `Delivery payment for request ${validatedData.deliveryRequestId}`
      });

      if (paymentResult.success) {
        // Update delivery request with payment information
        await storage.updateDeliveryRequest(validatedData.deliveryRequestId, {
          squarePaymentId: paymentResult.paymentId,
          paymentStatus: 'paid',
          totalAmount: validatedData.amount.toString()
        });

        res.json({
          success: true,
          paymentId: paymentResult.paymentId,
          receiptUrl: paymentResult.receiptUrl,
          status: paymentResult.status
        });
      } else {
        res.status(400).json({
          success: false,
          error: paymentResult.error
        });
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Payment processing failed" 
      });
    }
  });

  // Square Invoice Routes
  app.post("/api/invoices/create", async (req, res) => {
    try {
      const validatedData = createInvoiceSchema.parse(req.body);
      const tenantId = getCurrentTenantId(req);

      // Get delivery request details
      const deliveryRequest = await storage.getDeliveryRequestById(validatedData.deliveryRequestId);
      if (!deliveryRequest) {
        return res.status(404).json({ error: "Delivery request not found" });
      }

      // Create or find Square customer
      let customerId = validatedData.customerId;
      if (!customerId && validatedData.customerEmail) {
        try {
          const customer = await squareService.createCustomer({
            email: validatedData.customerEmail,
            firstName: deliveryRequest.customerName.split(' ')[0],
            lastName: deliveryRequest.customerName.split(' ').slice(1).join(' '),
            phone: deliveryRequest.phone
          });
          customerId = customer?.id;
        } catch (error) {
          console.warn("Failed to create Square customer:", error);
        }
      }

      if (!customerId) {
        return res.status(400).json({ 
          error: "Customer ID or email is required for invoicing" 
        });
      }

      // Create invoice with Square
      const invoiceResult = await squareService.createInvoice({
        orderId: validatedData.deliveryRequestId,
        customerId: customerId,
        title: validatedData.title,
        description: validatedData.description,
        amount: Math.round(validatedData.amount * 100), // Convert to cents
        dueDate: validatedData.dueDate,
        autoCharge: validatedData.autoCharge
      });

      if (invoiceResult.success) {
        // Update delivery request with invoice information
        await storage.updateDeliveryRequest(validatedData.deliveryRequestId, {
          squareInvoiceId: invoiceResult.invoiceId,
          invoiceUrl: invoiceResult.publicUrl,
          totalAmount: validatedData.amount.toString(),
          paymentStatus: validatedData.autoCharge ? 'processing' : 'pending'
        });

        res.json({
          success: true,
          invoiceId: invoiceResult.invoiceId,
          publicUrl: invoiceResult.publicUrl,
          status: invoiceResult.status
        });
      } else {
        res.status(400).json({
          success: false,
          error: invoiceResult.error
        });
      }
    } catch (error: any) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Invoice creation failed" 
      });
    }
  });

  // Get Square invoice details
  app.get("/api/invoices/:invoiceId", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoice = await squareService.getInvoice(invoiceId);
      res.json(invoice);
    } catch (error: any) {
      console.error("Get invoice error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to get invoice" 
      });
    }
  });

  // Process refund
  app.post("/api/payments/:paymentId/refund", async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid refund amount is required" });
      }

      const refund = await squareService.refundPayment(
        paymentId, 
        Math.round(amount * 100), // Convert to cents
        reason
      );

      res.json({
        success: true,
        refundId: refund?.id,
        status: refund?.status,
        amountRefunded: refund?.amountMoney?.amount ? Number(refund.amountMoney.amount) / 100 : 0
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

  // Admin routes
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}