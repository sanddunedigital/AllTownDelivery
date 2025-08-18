import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, numeric, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Pending signups table for email verification flow
export const pendingSignups = pgTable("pending_signups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  signupData: jsonb("signup_data").notNull(), // Store all signup form data
  verificationToken: text("verification_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenants table for multi-tenant SaaS support
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  subdomain: text("subdomain").unique(), // for tenant.yoursaas.com
  customDomain: text("custom_domain").unique(), // for custom domains
  slug: text("slug").unique(), // for path-based routing
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0369a1"),
  isActive: boolean("is_active").default(true).notNull(),
  planType: text("plan_type").default("trial").notNull(), // trial, basic, premium, enterprise
  
  // Contact & Business Info
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  businessType: text("business_type").notNull(),
  currentDeliveryVolume: text("current_delivery_volume").notNull(),
  description: text("description"),
  
  // Trial & Billing
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  billingStatus: text("billing_status").default("trial").notNull(), // trial, active, past_due, cancelled
  nextBillingDate: timestamp("next_billing_date"),
  
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
  role: text("role").default("customer").notNull(), // customer, driver, admin, dispatcher
  isOnDuty: boolean("is_on_duty").default(false), // true when driver is available for deliveries
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customer loyalty accounts per tenant
export const customerLoyaltyAccounts = pgTable("customer_loyalty_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  loyaltyPoints: integer("loyalty_points").default(0).notNull(),
  totalDeliveries: integer("total_deliveries").default(0).notNull(),
  freeDeliveryCredits: integer("free_delivery_credits").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserTenant: unique().on(table.userId, table.tenantId), // One loyalty account per user per tenant
}));

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
  // Payment and billing information
  squarePaymentId: text("square_payment_id"), // Square payment ID for tracking
  squareInvoiceId: text("square_invoice_id"), // Square invoice ID for invoicing
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed, refunded
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }), // Total delivery cost
  invoiceUrl: text("invoice_url"), // Square invoice public URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business settings for tenant customization
export const businessSettings = pgTable("business_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().unique(), // One settings per tenant
  
  // Basic Business Info
  serviceName: text("service_name").notNull(), // The display name on the subdomain
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone").notNull(),
  serviceArea: text("service_area").notNull(), // "Oskaloosa, IA" or "Des Moines Metro"
  
  // Pricing Configuration
  baseDeliveryFee: numeric("base_delivery_fee", { precision: 10, scale: 2 }).default("3.00"),
  pricePerMile: numeric("price_per_mile", { precision: 10, scale: 2 }).default("1.50"),
  minimumOrderValue: numeric("minimum_order_value", { precision: 10, scale: 2 }).default("10.00"),
  urgentDeliveryFee: numeric("urgent_delivery_fee", { precision: 10, scale: 2 }).default("10.00"),
  rushDeliveryMultiplier: numeric("rush_delivery_multiplier", { precision: 10, scale: 2 }).default("1.5"),
  freeDeliveryThreshold: numeric("free_delivery_threshold", { precision: 10, scale: 2 }),
  loyaltyPointsPerDollar: integer("loyalty_points_per_dollar").default(1),
  pointsForFreeDelivery: integer("points_for_free_delivery").default(10),
  baseFeeRadius: numeric("base_fee_radius_miles", { precision: 10, scale: 2 }).default("10.00"), // Miles within base fee applies
  
  // Service Configuration
  maxDeliveryRadius: integer("max_delivery_radius_miles").default(25),
  averageDeliveryTime: integer("average_delivery_time_minutes").default(30),
  operatingHours: jsonb("operating_hours").$type<{
    monday: { open: string; close: string; closed?: boolean };
    tuesday: { open: string; close: string; closed?: boolean };
    wednesday: { open: string; close: string; closed?: boolean };
    thursday: { open: string; close: string; closed?: boolean };
    friday: { open: string; close: string; closed?: boolean };
    saturday: { open: string; close: string; closed?: boolean };
    sunday: { open: string; close: string; closed?: boolean };
  }>(),
  
  // Additional Business Info
  businessName: text("business_name"), // Can be different from serviceName
  businessAddress: text("business_address"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  // Profile content
  businessDescription: text("business_description"),
  tagline: text("tagline"),
  serviceAreas: text("service_areas"),
  specialties: text("specialties"),
  welcomeMessage: text("welcome_message"),
  whyChooseUs: text("why_choose_us"),
  primaryColor: text("primary_color").default("#0369a1"),
  secondaryColor: text("secondary_color").default("#64748b"),
  accentColor: text("accent_color").default("#ea580c"),
  currency: text("currency").default("USD"),
  timezone: text("timezone").default("America/Chicago"),
  socialMediaLinks: jsonb("social_media_links").$type<{
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  }>(),
  
  // Service Features
  enableRealTimeTracking: boolean("enable_real_time_tracking").default(true),
  enableLoyaltyProgram: boolean("enable_loyalty_program").default(true),
  enableScheduledDeliveries: boolean("enable_scheduled_deliveries").default(false),
  enableMultiStopDeliveries: boolean("enable_multi_stop_deliveries").default(false),
  
  // Google Reviews Integration
  googlePlaceId: text("google_place_id"),
  enableGoogleReviews: boolean("enable_google_reviews").default(false),
  
  // Payment Options
  acceptedPaymentMethods: text("accepted_payment_methods").array().default(sql`ARRAY['cash_on_delivery', 'card_on_delivery', 'online_payment']`),
  requirePaymentUpfront: boolean("require_payment_upfront").default(false),
  
  // Square Payment Configuration (per tenant)
  squareAccessToken: text("square_access_token"), // Encrypted tenant's Square access token
  squareApplicationId: text("square_application_id"), // Tenant's Square application ID
  squareLocationId: text("square_location_id"), // Tenant's Square location ID
  squareEnvironment: text("square_environment").default("sandbox"), // sandbox or production
  
  // Notifications
  customerNotifications: jsonb("customer_notifications").$type<{
    sms: boolean;
    email: boolean;
    push: boolean;
  }>().default(sql`'{"sms": true, "email": true, "push": false}'`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Google Reviews cache table
export const googleReviews = pgTable("google_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'::uuid`).notNull(),
  placeId: text("place_id").notNull(),
  reviewData: jsonb("review_data").$type<{
    reviews: Array<{
      author_name: string;
      author_url?: string;
      profile_photo_url?: string;
      rating: number;
      relative_time_description: string;
      text: string;
      time: number;
    }>;
    rating: number;
    user_ratings_total: number;
  }>().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service area zones for delivery pricing
export const serviceZones = pgTable("service_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'::uuid`).notNull(),
  name: text("name").notNull(), // e.g., "Downtown", "Suburbs", "Extended Area"
  description: text("description"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  estimatedTime: integer("estimated_time_minutes").notNull(),
  isActive: boolean("is_active").default(true),
  zipCodes: text("zip_codes").array(),
  boundaries: jsonb("boundaries"), // For future map integration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business users table (for business login system)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role", { enum: ["customer", "admin", "driver", "dispatcher"] }).default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business settings schemas
export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBusinessSettingsSchema = insertBusinessSettingsSchema.partial();

// Combined business signup schema
export const combinedBusinessSignupSchema = z.object({
  // Business Information
  businessName: z.string().min(1, "Business name is required"), 
  businessType: z.string().min(1, "Business type is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  serviceArea: z.string().min(1, "Service area is required"),
  currentDeliveryVolume: z.string().min(1, "Delivery volume is required"),
  description: z.string().optional(),
  
  // Admin Setup
  adminUsername: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be 20 characters or less"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Service zones schemas
export const insertServiceZoneSchema = createInsertSchema(serviceZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateServiceZoneSchema = insertServiceZoneSchema.partial();

// Tenant schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  trialStartDate: true,
  trialEndDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  billingStatus: true,
  nextBillingDate: true,
});

export const updateTenantSchema = insertTenantSchema.partial();

// Pending signup schemas
export const insertPendingSignupSchema = createInsertSchema(pendingSignups).omit({
  id: true,
  createdAt: true,
});

// Main Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;
export type PendingSignup = typeof pendingSignups.$inferSelect;
export type InsertPendingSignup = z.infer<typeof insertPendingSignupSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type CustomerLoyaltyAccount = typeof customerLoyaltyAccounts.$inferSelect;
export type InsertCustomerLoyaltyAccount = z.infer<typeof insertCustomerLoyaltyAccountSchema>;
export type UpdateCustomerLoyaltyAccount = z.infer<typeof updateCustomerLoyaltyAccountSchema>;

// Google reviews schemas
export const insertGoogleReviewsSchema = createInsertSchema(googleReviews).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
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
});

export const updateUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Customer loyalty account schemas
export const insertCustomerLoyaltyAccountSchema = createInsertSchema(customerLoyaltyAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCustomerLoyaltyAccountSchema = insertCustomerLoyaltyAccountSchema.partial();

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

// Payment method constants
export const PREDEFINED_PAYMENT_METHODS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'card_on_delivery', label: 'Card on Delivery' },
  // { value: 'online_payment', label: 'Online Payment (Pre-paid)' }, // Temporarily disabled - Stripe integration coming soon
  { value: 'square_invoice', label: 'Square Invoice' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'google_pay', label: 'Google Pay' },
  { value: 'zelle', label: 'Zelle' },
] as const;

// Square payment schemas
export const processPaymentSchema = z.object({
  deliveryRequestId: z.string(),
  paymentToken: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
});

export const createInvoiceSchema = z.object({
  deliveryRequestId: z.string(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  title: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  dueDate: z.string().optional(),
  autoCharge: z.boolean().default(false),
});

// Legacy user schema (for compatibility)
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Additional type exports
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

export type InsertGoogleReviews = z.infer<typeof insertGoogleReviewsSchema>;
export type GoogleReviewsData = typeof googleReviews.$inferSelect;

export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
export type InsertDeliveryRequestGuest = z.infer<typeof insertDeliveryRequestGuestSchema>;
export type InsertDeliveryRequestAuthenticated = z.infer<typeof insertDeliveryRequestAuthenticatedSchema>;

export type ClaimDelivery = z.infer<typeof claimDeliverySchema>;
export type UpdateDeliveryStatus = z.infer<typeof updateDeliveryStatusSchema>;
export type UpdateDriverStatus = z.infer<typeof updateDriverStatusSchema>;

// Legacy types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
