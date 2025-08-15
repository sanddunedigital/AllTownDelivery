import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" text NOT NULL,
        "password" text NOT NULL,
        CONSTRAINT "users_username_unique" UNIQUE("username")
      );
    `);

    // Create delivery_requests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "delivery_requests" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "customer_name" text NOT NULL,
        "phone" text NOT NULL,
        "email" text,
        "pickup_address" text NOT NULL,
        "delivery_address" text NOT NULL,
        "preferred_date" text NOT NULL,
        "preferred_time" text NOT NULL,
        "delivery_type" text NOT NULL,
        "payment_method" text NOT NULL,
        "special_instructions" text,
        "marketing_consent" text,
        "user_id" text,
        "status" text DEFAULT 'pending',
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create user_profiles table for loyalty program
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id" text PRIMARY KEY NOT NULL,
        "email" text NOT NULL,
        "full_name" text,
        "phone" text,
        "default_pickup_address" text,
        "default_delivery_address" text,
        "preferred_payment_method" text,
        "loyalty_points" integer DEFAULT 0,
        "total_deliveries" integer DEFAULT 0,
        "free_delivery_credits" integer DEFAULT 0,
        "marketing_consent" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Add missing columns to delivery_requests table (update existing schema)
    await db.execute(sql`
      ALTER TABLE "delivery_requests" 
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
      ADD COLUMN IF NOT EXISTS "business_id" varchar,
      ADD COLUMN IF NOT EXISTS "used_free_delivery" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "claimed_by_driver" uuid,
      ADD COLUMN IF NOT EXISTS "claimed_at" timestamp,
      ADD COLUMN IF NOT EXISTS "driver_notes" text,
      ADD COLUMN IF NOT EXISTS "delivery_fee" numeric(10,2),
      ADD COLUMN IF NOT EXISTS "square_payment_id" text,
      ADD COLUMN IF NOT EXISTS "square_invoice_id" text,
      ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "total_amount" numeric(10,2),
      ADD COLUMN IF NOT EXISTS "invoice_url" text;
    `);

    // Update delivery_requests table to fix column types and constraints
    await db.execute(sql`
      ALTER TABLE "delivery_requests" 
      ALTER COLUMN "email" SET NOT NULL,
      ALTER COLUMN "status" SET NOT NULL;
    `);

    console.log("Database tables created and updated successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
    throw error;
  }
}