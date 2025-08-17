import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { tenants } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Sara's Quickie default tenant ID
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Tenant context interface
export interface TenantContext {
  id: string;
  companyName: string;
  subdomain?: string;
  customDomain?: string;
  slug?: string;
  logoUrl?: string;
  primaryColor: string;
  planType: string;
  isMainSite?: boolean; // Flag to indicate this is the main marketing site
}

// In-memory tenant cache for performance
const tenantCache = new Map<string, TenantContext>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

// Get tenant by various identifiers
export async function getTenantBySubdomain(subdomain: string): Promise<TenantContext | null> {
  const cacheKey = `subdomain:${subdomain}`;
  
  // Check cache first
  if (tenantCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp < CACHE_TIMEOUT) {
      return tenantCache.get(cacheKey)!;
    }
  }

  try {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const tenant = transformTenant(result[0]);
    tenantCache.set(cacheKey, tenant);
    cacheTimestamps.set(cacheKey, Date.now());
    
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant by subdomain:', error);
    return null;
  }
}

export async function getTenantByCustomDomain(domain: string): Promise<TenantContext | null> {
  const cacheKey = `domain:${domain}`;
  
  // Check cache first
  if (tenantCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp < CACHE_TIMEOUT) {
      return tenantCache.get(cacheKey)!;
    }
  }

  try {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.customDomain, domain))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const tenant = transformTenant(result[0]);
    tenantCache.set(cacheKey, tenant);
    cacheTimestamps.set(cacheKey, Date.now());
    
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant by custom domain:', error);
    return null;
  }
}

export async function getTenantById(id: string): Promise<TenantContext | null> {
  const cacheKey = `id:${id}`;
  
  // Check cache first
  if (tenantCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp < CACHE_TIMEOUT) {
      return tenantCache.get(cacheKey)!;
    }
  }

  try {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const tenant = transformTenant(result[0]);
    tenantCache.set(cacheKey, tenant);
    cacheTimestamps.set(cacheKey, Date.now());
    
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant by ID:', error);
    return null;
  }
}

// Transform database tenant to context format
function transformTenant(dbTenant: any): TenantContext {
  return {
    id: dbTenant.id,
    companyName: dbTenant.companyName,
    subdomain: dbTenant.subdomain,
    customDomain: dbTenant.customDomain,
    slug: dbTenant.slug,
    logoUrl: dbTenant.logoUrl,
    primaryColor: dbTenant.primaryColor || '#f97316',
    planType: dbTenant.planType || 'basic',
  };
}

// Get default tenant (Sara's Quickie)
export async function getDefaultTenant(): Promise<TenantContext> {
  let tenant = await getTenantById(DEFAULT_TENANT_ID);
  
  if (!tenant) {
    // Fallback to Sara's Quickie if not found in DB
    tenant = {
      id: DEFAULT_TENANT_ID,
      companyName: "Sara's Quickie Delivery",
      subdomain: 'saras-quickie-delivery',
      customDomain: 'sarasquickiedelivery.com',
      slug: 'saras-quickie',
      logoUrl: 'https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400',
      primaryColor: '#f97316',
      planType: 'premium',
    };
  }
  
  return tenant;
}

// Middleware to resolve tenant from request
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  let tenant: TenantContext | null = null;
  let isMainSite = false;

  try {
    // Extract host information
    const host = req.headers.host || '';
    const hostParts = host.split('.');

    // Check if this is a development environment - be very aggressive about this
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         host.includes('replit.app') || host.includes('replit.dev') || host.includes('repl.co') || 
                         host.includes('localhost') || host.includes('vercel.app') ||
                         host.includes('replit') || // Catch any replit domain variations
                         !host.includes('alltowndelivery.com'); // If it's not the production domain, treat as development
    
    // For development environments, ALWAYS treat as main marketing site
    // For production, only treat as main site if it's the actual alltowndelivery.com domain
    if (isDevelopment) {
      // Development environment - always main site
      isMainSite = true;
      tenant = {
        id: 'main-site',
        companyName: 'AllTownDelivery',
        primaryColor: '#0369a1',
        planType: 'platform',
        isMainSite: true,
      };
    } else if (host.toLowerCase() === 'alltowndelivery.com' || host.toLowerCase() === 'www.alltowndelivery.com') {
      // Production main domain
      isMainSite = true;
      tenant = {
        id: 'main-site',
        companyName: 'AllTownDelivery',
        primaryColor: '#0369a1',
        planType: 'platform',
        isMainSite: true,
      };
    } else {
      // Production subdomain or custom domain
      isMainSite = false;
      
      // 1. Try custom domain first (e.g., sarasquickiedelivery.com)
      if (hostParts.length >= 2) {
        const domain = host.toLowerCase();
        tenant = await getTenantByCustomDomain(domain);
      }

      // 2. Try subdomain if no custom domain match (e.g., saras.alltowndelivery.com)
      if (!tenant && hostParts.length >= 3) {
        const subdomain = hostParts[0].toLowerCase();
        tenant = await getTenantBySubdomain(subdomain);
      }

      // No tenant found for this subdomain/domain
      if (!tenant) {

        return res.status(404).json({ 
          error: 'Subdomain not found',
          message: 'This subdomain is not associated with any delivery service.',
          isInvalidSubdomain: true
        });
      }
    }

    // Add tenant to request context
    (req as any).tenant = tenant;
    (req as any).isMainSite = isMainSite;
    
    // Set tenant context for database queries
    (req as any).tenantId = tenant ? tenant.id : 'main-site';

    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    
    // Return error instead of fallback for better debugging
    return res.status(500).json({ 
      error: 'Tenant resolution error',
      message: 'Unable to determine tenant context'
    });
  }
}

// Helper function to get current tenant from request
export function getCurrentTenant(req: Request): TenantContext {
  return (req as any).tenant || getDefaultTenant();
}

// Helper function to get current tenant ID from request
export function getCurrentTenantId(req: Request): string {
  return (req as any).tenantId || DEFAULT_TENANT_ID;
}

// Clear tenant cache (useful for admin operations)
export function clearTenantCache() {
  tenantCache.clear();
  cacheTimestamps.clear();
}

// Validate tenant exists and is active
export async function validateTenant(tenantId: string): Promise<boolean> {
  try {
    const tenant = await getTenantById(tenantId);
    return tenant !== null;
  } catch (error) {
    console.error('Error validating tenant:', error);
    return false;
  }
}