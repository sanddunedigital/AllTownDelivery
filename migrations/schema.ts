import { pgTable, unique, uuid, text, boolean, timestamp, numeric, integer, jsonb, index, foreignKey, pgPolicy, varchar, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const tenants = pgTable("tenants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: text("company_name").notNull(),
	subdomain: text(),
	customDomain: text("custom_domain"),
	slug: text(),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color").default('#f97316'),
	isActive: boolean("is_active").default(true).notNull(),
	planType: text("plan_type").default('basic').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tenants_subdomain_key").on(table.subdomain),
	unique("tenants_custom_domain_key").on(table.customDomain),
	unique("tenants_slug_key").on(table.slug),
]);

export const businessSettings = pgTable("business_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	baseDeliveryFee: numeric("base_delivery_fee", { precision: 10, scale:  2 }).default('5.00'),
	urgentDeliveryFee: numeric("urgent_delivery_fee", { precision: 10, scale:  2 }).default('10.00'),
	freeDeliveryThreshold: numeric("free_delivery_threshold", { precision: 10, scale:  2 }),
	loyaltyPointsPerDollar: integer("loyalty_points_per_dollar").default(1),
	pointsForFreeDelivery: integer("points_for_free_delivery").default(10),
	maxDeliveryRadiusMiles: integer("max_delivery_radius_miles").default(25),
	averageDeliveryTimeMinutes: integer("average_delivery_time_minutes").default(30),
	operatingHours: jsonb("operating_hours"),
	businessPhone: text("business_phone"),
	businessEmail: text("business_email"),
	businessAddress: text("business_address"),
	websiteUrl: text("website_url"),
	socialMediaLinks: jsonb("social_media_links"),
	enableRealTimeTracking: boolean("enable_real_time_tracking").default(true),
	enableLoyaltyProgram: boolean("enable_loyalty_program").default(true),
	enableScheduledDeliveries: boolean("enable_scheduled_deliveries").default(false),
	enableMultiStopDeliveries: boolean("enable_multi_stop_deliveries").default(false),
	acceptedPaymentMethods: text("accepted_payment_methods").array().default(["RAY['cash'::text", "'credit_card'::text", "'digital_wallet'::tex"]),
	requirePaymentUpfront: boolean("require_payment_upfront").default(false),
	customerNotifications: jsonb("customer_notifications").default({"sms":true,"push":false,"email":true}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const deliveryRequests = pgTable("delivery_requests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	customerName: text("customer_name").notNull(),
	phone: text().notNull(),
	email: text(),
	pickupAddress: text("pickup_address").notNull(),
	deliveryAddress: text("delivery_address").notNull(),
	preferredDate: text("preferred_date").notNull(),
	preferredTime: text("preferred_time").notNull(),
	paymentMethod: text("payment_method").notNull(),
	specialInstructions: text("special_instructions"),
	marketingConsent: text("marketing_consent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	userId: text("user_id"),
	status: text().default('pending'),
	claimedByDriver: text("claimed_by_driver"),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	driverNotes: text("driver_notes"),
	usedFreeDelivery: boolean("used_free_delivery").default(false),
	businessId: varchar("business_id"),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
}, (table) => [
	index("idx_delivery_requests_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "fk_delivery_requests_tenant_id"
		}).onDelete("restrict"),
	pgPolicy("Anyone can create delivery requests", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`((( SELECT auth.uid() AS uid) IS NULL) OR ((( SELECT auth.uid() AS uid))::text = user_id))`  }),
	pgPolicy("Users can view own delivery requests", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can update delivery requests", { as: "permissive", for: "update", to: ["public"] }),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	pgPolicy("Users can view own user record", { as: "permissive", for: "select", to: ["public"], using: sql`((id)::text = (( SELECT auth.uid() AS uid))::text)` }),
	pgPolicy("Users can insert own user record", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own user record", { as: "permissive", for: "update", to: ["public"] }),
]);

export const userProfiles = pgTable("user_profiles", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	fullName: text("full_name"),
	phone: text(),
	defaultPickupAddress: text("default_pickup_address"),
	defaultDeliveryAddress: text("default_delivery_address"),
	preferredPaymentMethod: text("preferred_payment_method"),
	loyaltyPoints: integer("loyalty_points").default(0),
	totalDeliveries: integer("total_deliveries").default(0),
	freeDeliveryCredits: integer("free_delivery_credits").default(0),
	marketingConsent: boolean("marketing_consent").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	role: text().default('customer'),
	isOnDuty: boolean("is_on_duty").default(false),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
}, (table) => [
	index("idx_user_profiles_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "fk_user_profiles_tenant_id"
		}).onDelete("restrict"),
	pgPolicy("Users can view own profile", { as: "permissive", for: "select", to: ["public"], using: sql`((( SELECT auth.uid() AS uid))::text = id)` }),
	pgPolicy("Users can insert own profile", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own profile", { as: "permissive", for: "update", to: ["public"] }),
	check("user_profiles_role_check", sql`role = ANY (ARRAY['customer'::text, 'driver'::text, 'admin'::text])`),
]);

export const businesses = pgTable("businesses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	address: text().notNull(),
	website: text(),
	orderingInstructions: text("ordering_instructions").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	category: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
}, (table) => [
	index("idx_businesses_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "fk_businesses_tenant_id"
		}).onDelete("restrict"),
]);

export const serviceZones = pgTable("service_zones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000001'`).notNull(),
	name: text().notNull(),
	description: text(),
	deliveryFee: numeric("delivery_fee", { precision: 10, scale:  2 }).notNull(),
	estimatedTimeMinutes: integer("estimated_time_minutes").notNull(),
	isActive: boolean("is_active").default(true),
	zipCodes: text("zip_codes").array(),
	boundaries: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
