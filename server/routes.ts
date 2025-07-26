import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDeliveryRequestSchema, 
  insertUserProfileSchema, 
  updateUserProfileSchema,
  insertDeliveryRequestGuestSchema,
  insertDeliveryRequestAuthenticatedSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User Profile Routes
  
  // Get user profile
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getUserProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
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

  // Check loyalty eligibility
  app.get("/api/users/:id/loyalty", async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getUserProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
      }
      
      const eligibleForFree = await storage.checkLoyaltyEligibility(id);
      res.json({
        loyaltyPoints: profile.loyaltyPoints,
        totalDeliveries: profile.totalDeliveries,
        freeDeliveryCredits: profile.freeDeliveryCredits,
        eligibleForFreeDelivery: eligibleForFree,
        deliveriesUntilNextFree: 10 - ((profile.totalDeliveries || 0) % 10)
      });
    } catch (error) {
      console.error("Error checking loyalty status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delivery Request Routes

  // Create delivery request (supports both guest and authenticated users)
  app.post("/api/delivery-requests", async (req, res) => {
    try {
      const { userId, saveProfile, useStoredPayment, ...requestData } = req.body;
      
      let validatedData;
      if (userId) {
        // Authenticated user request
        validatedData = insertDeliveryRequestAuthenticatedSchema.parse(req.body);
        
        // If user wants to save profile data
        if (saveProfile) {
          const profile = await storage.getUserProfile(userId);
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

      const deliveryRequest = await storage.createDeliveryRequest(validatedData);
      
      // Update loyalty points for authenticated users
      if (userId && deliveryRequest.status === "pending") {
        await storage.updateLoyaltyPoints(userId, 1); // 1 point per delivery
      }
      
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
      
      await storage.updateDeliveryStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
