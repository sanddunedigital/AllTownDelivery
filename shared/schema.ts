import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenant SaaS support
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  subdomain: text("subdomain").unique(), // for tenant.yoursaas.com
  customDomain: text("custom_domain").unique(), // for custom domains
  slug: text("slug").unique(), // for path-based routing
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#f97316"), // Default orange
  isActive: boolean("is_active").default(true).notNull(),
  planType: text("plan_type").default("basic").notNull(), // basic, premium, enterprise
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User profiles table (linked to Supabase Auth users)
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // This will match Supabase Auth user ID
  tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'::uuid`).notNull(), // Default to Sara's tenant
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
  role: text("role").default("customer").notNull(), // customer, driver, admin, dispatcher
  isOnDuty: boolean("is_on_duty").default(false), // true when driver is available for deliveries
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business partners table
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'::uuid`).notNull(), // Default to Sara's tenant
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  website: text("website"),
  orderingInstructions: text("ordering_instructions").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  category: text("category"), // e.g., "restaurant", "grocery", "retail"
  imageUrl: text("image_url"), // Supabase Storage URL for business image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deliveryRequests = pgTable("delivery_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'::uuid`).notNull(), // Default to Sara's tenant
  userId: uuid("user_id"), // Optional - for guest checkouts
  businessId: varchar("business_id"), // References businesses.id for pickup location
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  pickupAddress: text("pickup_address").notNull(), // Keep for custom/non-business pickups
  deliveryAddress: text("delivery_address").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
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

// Tenant schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Business schemas
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
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
  marketingConsent: true, // Remove marketing consent field
}).extend({
  businessId: z.string().min(1, "Please select a business"), // Make businessId required with validation
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  preferredDate: z.string().min(1, "Pick up date is required"),
  preferredTime: z.string().min(1, "Pick up time is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  specialInstructions: z.string().optional(), // Keep optional
  usedFreeDelivery: z.boolean().optional(), // Allow passing usedFreeDelivery flag
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

export const updateDriverStatusSchema = z.object({
  isOnDuty: z.boolean(),
});

// Legacy user schema (for compatibility)
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Type exports
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
export type InsertDeliveryRequestGuest = z.infer<typeof insertDeliveryRequestGuestSchema>;
export type InsertDeliveryRequestAuthenticated = z.infer<typeof insertDeliveryRequestAuthenticatedSchema>;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;

export type ClaimDelivery = z.infer<typeof claimDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;
export type UpdateDriverStatus = z.infer<typeof updateDriverStatusSchema>;

// Legacy types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
