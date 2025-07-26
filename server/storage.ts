import { type User, type InsertUser, type DeliveryRequest, type InsertDeliveryRequest, users, deliveryRequests } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;
  getDeliveryRequests(): Promise<DeliveryRequest[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private deliveryRequests: Map<string, DeliveryRequest>;

  constructor() {
    this.users = new Map();
    this.deliveryRequests = new Map();
  }

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

  async createDeliveryRequest(insertRequest: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const id = randomUUID();
    const request: DeliveryRequest = { 
      ...insertRequest,
      email: insertRequest.email || null,
      specialInstructions: insertRequest.specialInstructions || null,
      marketingConsent: insertRequest.marketingConsent || null,
      id,
      createdAt: new Date()
    };
    this.deliveryRequests.set(id, request);
    return request;
  }

  async getDeliveryRequests(): Promise<DeliveryRequest[]> {
    return Array.from(this.deliveryRequests.values());
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createDeliveryRequest(insertRequest: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const requestData = {
      ...insertRequest,
      email: insertRequest.email || null,
      specialInstructions: insertRequest.specialInstructions || null,
      marketingConsent: insertRequest.marketingConsent || null,
    };
    const result = await db.insert(deliveryRequests).values(requestData).returning();
    return result[0];
  }

  async getDeliveryRequests(): Promise<DeliveryRequest[]> {
    return await db.select().from(deliveryRequests);
  }
}

// Use database storage in production, memory storage for development
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
