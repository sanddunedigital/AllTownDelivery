import { relations } from "drizzle-orm/relations";
import { tenants, deliveryRequests, userProfiles, businesses } from "./schema";

export const deliveryRequestsRelations = relations(deliveryRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [deliveryRequests.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	deliveryRequests: many(deliveryRequests),
	userProfiles: many(userProfiles),
	businesses: many(businesses),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	tenant: one(tenants, {
		fields: [userProfiles.tenantId],
		references: [tenants.id]
	}),
}));

export const businessesRelations = relations(businesses, ({one}) => ({
	tenant: one(tenants, {
		fields: [businesses.tenantId],
		references: [tenants.id]
	}),
}));