#!/usr/bin/env node

// Google Reviews Update Script - Runs via Replit Scheduled Deployments
// This script fetches fresh reviews for all tenants with Google Place IDs

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import { googleReviews, businessSettings } from "../shared/schema.js";
import { GooglePlacesService } from "../server/googlePlaces.js";

// Database connection
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

async function updateAllReviews() {
  try {
    console.log("Starting Google Reviews update job...");
    
    // Get all tenants with Google Place IDs configured
    const tenantsWithPlaceIds = await db
      .select({
        tenantId: businessSettings.tenantId,
        googlePlaceId: businessSettings.googlePlaceId,
        enableGoogleReviews: businessSettings.enableGoogleReviews
      })
      .from(businessSettings)
      .where(and(
        eq(businessSettings.enableGoogleReviews, true),
        eq(businessSettings.googlePlaceId, businessSettings.googlePlaceId) // Not null check
      ));

    if (tenantsWithPlaceIds.length === 0) {
      console.log("No tenants with Google Reviews enabled found");
      return;
    }

    console.log(`Found ${tenantsWithPlaceIds.length} tenants with Google Reviews enabled`);

    const googlePlaces = new GooglePlacesService();
    let successCount = 0;
    let errorCount = 0;

    for (const tenant of tenantsWithPlaceIds) {
      try {
        console.log(`Updating reviews for tenant ${tenant.tenantId} (Place ID: ${tenant.googlePlaceId})`);
        
        // Fetch fresh reviews from Google Places API
        const reviewData = await googlePlaces.getPlaceReviews(tenant.googlePlaceId);
        
        if (!reviewData) {
          console.error(`Failed to fetch reviews for tenant ${tenant.tenantId}`);
          errorCount++;
          continue;
        }

        // Check if we already have reviews for this tenant
        const existingReviews = await db
          .select()
          .from(googleReviews)
          .where(eq(googleReviews.tenantId, tenant.tenantId))
          .limit(1);

        if (existingReviews.length > 0) {
          // Update existing reviews
          await db
            .update(googleReviews)
            .set({
              reviewData: reviewData,
              lastUpdated: new Date(),
              placeId: tenant.googlePlaceId
            })
            .where(eq(googleReviews.tenantId, tenant.tenantId));
        } else {
          // Insert new reviews
          await db
            .insert(googleReviews)
            .values({
              tenantId: tenant.tenantId,
              placeId: tenant.googlePlaceId,
              reviewData: reviewData,
              lastUpdated: new Date()
            });
        }

        console.log(`✓ Updated reviews for tenant ${tenant.tenantId} - ${reviewData.reviews.length} reviews, ${reviewData.rating} rating`);
        successCount++;
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error updating reviews for tenant ${tenant.tenantId}:`, error);
        errorCount++;
      }
    }

    console.log(`\nGoogle Reviews update job completed:`);
    console.log(`- ${successCount} tenants updated successfully`);
    console.log(`- ${errorCount} tenants failed to update`);
    
  } catch (error) {
    console.error("Error in reviews update job:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the job
updateAllReviews().catch(error => {
  console.error("Fatal error in reviews update job:", error);
  process.exit(1);
});