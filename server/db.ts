import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Vercel serverless optimizations
  max: 1, // Maximum pool size (serverless functions are stateless)
  min: 0, // Minimum pool size 
  idleTimeoutMillis: 30000, // 30 seconds
  allowExitOnIdle: true // Allow process to exit when idle
});

export const db = drizzle(pool, { schema });

// Graceful shutdown for serverless
process.on('beforeExit', async () => {
  await pool.end();
});