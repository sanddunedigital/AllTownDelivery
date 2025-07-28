import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles table (linked to Supabase Auth users)
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // This will match Supabase Auth user ID
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  defaultPickupAddress: text("default_pickup_address"),
  defaultDeliveryAddress: text("default_delivery_address"),
  preferredPaymentMethod: text("preferred_payment_method"),
  marketingConsent: boolean("marketing_consent").default(false),
  loyaltyPoints: integer("loyalty_points").default(0),
  totalDeliveries: integer("total_deliveries").default(0),
  freeDeliveryCredits: integer("free_delivery_credits").default(0),
  role: text("role").default("customer").notNull(), // customer, driver, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deliveryRequests = pgTable("delivery_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"), // Optional - for guest checkouts
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  deliveryType: text("delivery_type").notNull(),
  paymentMethod: text("payment_method").notNull(),
  specialInstructions: text("special_instructions"),
  marketingConsent: text("marketing_consent"),
  status: text("status").default("pending").notNull(), // pending, available, claimed, in_progress, completed, cancelled
  usedFreeDelivery: boolean("used_free_delivery").default(false),
  claimedByDriver: uuid("claimed_by_driver"), // References user_profiles.id where role = 'driver'
  claimedAt: timestamp("claimed_at"),
  driverNotes: text("driver_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy users table (can be removed later)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// User profile schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  createdAt: true,
  updatedAt: true,
  loyaltyPoints: true,
  totalDeliveries: true,
  freeDeliveryCredits: true,
});

export const updateUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Delivery request schemas
export const insertDeliveryRequestSchema = createInsertSchema(deliveryRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  usedFreeDelivery: true,
});

export const insertDeliveryRequestGuestSchema = insertDeliveryRequestSchema.omit({
  userId: true,
});

export const insertDeliveryRequestAuthenticatedSchema = insertDeliveryRequestSchema.extend({
  saveProfile: z.boolean().optional(), // For saving delivery info to profile
  useStoredPayment: z.boolean().optional(), // For using stored payment method
});

// Driver-related schemas
export const claimDeliverySchema = z.object({
  deliveryId: z.string(),
  driverNotes: z.string().optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['available', 'claimed', 'in_progress', 'completed', 'cancelled']),
  driverNotes: z.string().optional(),
});

// Legacy user schema (for compatibility)
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Type exports
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
export type InsertDeliveryRequestGuest = z.infer<typeof insertDeliveryRequestGuestSchema>;
export type InsertDeliveryRequestAuthenticated = z.infer<typeof insertDeliveryRequestAuthenticatedSchema>;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;

export type ClaimDelivery = z.infer<typeof claimDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;

// Legacy types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
