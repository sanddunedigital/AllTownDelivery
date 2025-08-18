-- Migration: Add customer loyalty accounts table and implement RLS policies
-- Date: January 2025

-- Create customer loyalty accounts table
CREATE TABLE IF NOT EXISTS customer_loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  free_delivery_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, tenant_id)
);

-- Migrate existing loyalty data from user_profiles to customer_loyalty_accounts
INSERT INTO customer_loyalty_accounts (user_id, tenant_id, loyalty_points, total_deliveries, free_delivery_credits, created_at, updated_at)
SELECT 
  id as user_id,
  tenant_id,
  COALESCE(loyalty_points, 0) as loyalty_points,
  COALESCE(total_deliveries, 0) as total_deliveries,
  COALESCE(free_delivery_credits, 0) as free_delivery_credits,
  created_at,
  updated_at
FROM user_profiles
WHERE (loyalty_points > 0 OR total_deliveries > 0 OR free_delivery_credits > 0)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Remove loyalty columns from user_profiles (now handled by customer_loyalty_accounts)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS loyalty_points;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS total_deliveries;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS free_delivery_credits;

-- Enable Row Level Security on sensitive tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Admin/business users can view profiles within their tenant
CREATE POLICY "Admins can view tenant profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.id::text = auth.uid()::text 
      AND admin_profile.role IN ('admin', 'dispatcher')
      AND admin_profile.tenant_id = user_profiles.tenant_id
    )
  );

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- RLS Policies for customer_loyalty_accounts
-- Users can see their own loyalty accounts across all tenants
CREATE POLICY "Users can view own loyalty accounts" ON customer_loyalty_accounts
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Tenant admins can view loyalty accounts for their tenant
CREATE POLICY "Admins can view tenant loyalty accounts" ON customer_loyalty_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.id::text = auth.uid()::text 
      AND admin_profile.role IN ('admin', 'dispatcher')
      AND admin_profile.tenant_id = customer_loyalty_accounts.tenant_id
    )
  );

-- Allow loyalty account creation and updates
CREATE POLICY "Allow loyalty account creation" ON customer_loyalty_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow loyalty account updates" ON customer_loyalty_accounts
  FOR UPDATE USING (true);

-- RLS Policies for delivery_requests
-- Users can see their own delivery requests
CREATE POLICY "Users can view own delivery requests" ON delivery_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Tenant users (admin, dispatcher, driver) can view requests for their tenant
CREATE POLICY "Tenant users can view tenant requests" ON delivery_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles tenant_user 
      WHERE tenant_user.id::text = auth.uid()::text 
      AND tenant_user.role IN ('admin', 'dispatcher', 'driver')
      AND tenant_user.tenant_id = delivery_requests.tenant_id
    )
  );

-- Allow delivery request creation
CREATE POLICY "Allow delivery request creation" ON delivery_requests
  FOR INSERT WITH CHECK (true);

-- Allow delivery request updates by tenant users
CREATE POLICY "Tenant users can update requests" ON delivery_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles tenant_user 
      WHERE tenant_user.id::text = auth.uid()::text 
      AND tenant_user.role IN ('admin', 'dispatcher', 'driver')
      AND tenant_user.tenant_id = delivery_requests.tenant_id
    )
  );

-- RLS Policies for business_settings
-- Only tenant admins can view/modify business settings for their tenant
CREATE POLICY "Admins can view tenant business settings" ON business_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.id::text = auth.uid()::text 
      AND admin_profile.role = 'admin'
      AND admin_profile.tenant_id = business_settings.tenant_id
    )
  );

CREATE POLICY "Admins can update tenant business settings" ON business_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.id::text = auth.uid()::text 
      AND admin_profile.role = 'admin'
      AND admin_profile.tenant_id = business_settings.tenant_id
    )
  );

-- Allow business settings creation during tenant setup
CREATE POLICY "Allow business settings creation" ON business_settings
  FOR INSERT WITH CHECK (true);

-- Keep businesses table public for cross-tenant browsing
-- (No RLS needed - customers should see all delivery services)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_user_tenant ON customer_loyalty_accounts(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tenant ON customer_loyalty_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_role ON user_profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tenant ON delivery_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_user ON delivery_requests(user_id);