import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import dispatchRoutes from "./dispatch-routes";
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

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Delivery Request Routes

  // Create delivery request (supports both guest and authenticated users)
  app.post("/api/delivery-requests", async (req, res) => {
    try {
      const { userId, saveProfile, useStoredPayment, ...requestData } = req.body;
      
      let validatedData;
      let usedFreeDelivery = false;
      
      if (userId) {
        // Authenticated user request
        validatedData = insertDeliveryRequestAuthenticatedSchema.parse(req.body);
        
        // Check if user has free delivery credits and auto-apply them
        const profile = await storage.getUserProfile(userId);
        if (profile?.freeDeliveryCredits && profile.freeDeliveryCredits > 0) {
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

      // Add the usedFreeDelivery flag to the request
      const deliveryRequestData = {
        ...validatedData,
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
      
      // Award loyalty points when delivery is completed
      if (status === 'completed' && delivery?.userId) {
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
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Dispatch routes
  app.use('/api/dispatch', dispatchRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
