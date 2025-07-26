import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeliveryRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create delivery request
  app.post("/api/delivery-requests", async (req, res) => {
    try {
      const validatedData = insertDeliveryRequestSchema.parse(req.body);
      const deliveryRequest = await storage.createDeliveryRequest(validatedData);
      res.json(deliveryRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get all delivery requests (admin endpoint)
  app.get("/api/delivery-requests", async (req, res) => {
    try {
      const requests = await storage.getDeliveryRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
