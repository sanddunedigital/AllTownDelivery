-- Migration: Add tenant support for multi-tenant SaaS architecture
-- This migration adds tenant isolation while preserving existing data

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  is_active BOOLEAN DEFAULT true NOT NULL,
  plan_type TEXT DEFAULT 'basic' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert Sara's Quickie as the default tenant
INSERT INTO tenants (
  id,
  company_name,
  subdomain,
  custom_domain,
  slug,
  logo_url,
  primary_color,
  plan_type,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sara''s Quickie Delivery',
  'saras',
  'sarasquickiedelivery.com',
  'saras-quickie',
  'https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400',
  '#f97316',
  'premium',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add tenant_id columns to existing tables if they don't exist
DO $$
BEGIN
  -- Add tenant_id to user_profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL;
  END IF;

  -- Add tenant_id to businesses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL;
  END IF;

  -- Add tenant_id to delivery_requests if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE delivery_requests ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL;
  END IF;
END $$;

-- Create indexes for efficient tenant-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_tenant_id ON businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tenant_id ON delivery_requests(tenant_id);

-- Add foreign key constraints to ensure data integrity
DO $$
BEGIN
  -- Add foreign key constraint for user_profiles.tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_profiles_tenant_id'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_tenant_id 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;

  -- Add foreign key constraint for businesses.tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_businesses_tenant_id'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT fk_businesses_tenant_id 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;

  -- Add foreign key constraint for delivery_requests.tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_delivery_requests_tenant_id'
  ) THEN
    ALTER TABLE delivery_requests ADD CONSTRAINT fk_delivery_requests_tenant_id 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Create RLS policies for multi-tenant isolation
-- Note: RLS is disabled by default for now to maintain current functionality
-- When multi-tenant SaaS is activated, these can be enabled

-- Enable RLS on all tenant-related tables (commented out for now)
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (commented out for now)
-- CREATE POLICY "tenant_isolation_user_profiles" ON user_profiles
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- CREATE POLICY "tenant_isolation_businesses" ON businesses
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- CREATE POLICY "tenant_isolation_delivery_requests" ON delivery_requests
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Update existing data to belong to Sara's tenant (already done via defaults)
-- This ensures all existing users, businesses, and delivery requests belong to Sara's tenant

-- Create a function to easily switch tenant context (for future use)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get current tenant context (for future use)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '00000000-0000-0000-0000-000000000001'::uuid; -- Default to Sara's tenant
END;
$$ LANGUAGE plpgsql;