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
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
    throw error;
  }
}