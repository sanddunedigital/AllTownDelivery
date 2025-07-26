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

    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
    throw error;
  }
}