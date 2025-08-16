import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { runMigrations } from "../server/migrate";
import { resolveTenant } from "../server/tenant";

const app = express();

// Increase body size limits to handle logo uploads (up to 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add tenant resolution middleware early in the pipeline
app.use(resolveTenant);

// Simple logging middleware for production
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

let initialized = false;

async function initializeApp() {
  if (initialized) return;
  
  try {
    console.log("Initializing database...");
    console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
    console.log("VITE_SUPABASE_URL present:", !!process.env.VITE_SUPABASE_URL);
    
    await runMigrations();
    console.log("Database connected and tables created successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
  }

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Express error handler:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message, error: err.stack });
  });

  initialized = true;
}

export default async function handler(req: any, res: any) {
  await initializeApp();
  return app(req, res);
}