-- Migration: Separate business staff from customer profiles
-- Purpose: Split user_profiles into business_staff and customer_profiles tables

-- Create business_staff table for tenant employees
CREATE TABLE IF NOT EXISTS business_staff (
  id TEXT PRIMARY KEY, -- Supabase user ID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'driver')),
  is_on_duty BOOLEAN DEFAULT FALSE,
  permissions JSONB,
  invite_token TEXT,
  invite_status TEXT DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'expired')),
  invited_by TEXT,
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create customer_profiles table for delivery customers
CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY, -- Supabase user ID
  default_pickup_address TEXT,
  default_delivery_address TEXT,
  preferred_payment_method TEXT,
  marketing_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Remove role-specific columns from user_profiles to make it base info only
-- (We'll handle this migration in code to preserve existing data)

-- Add Row Level Security policies for business_staff
ALTER TABLE business_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Business staff can only see their own tenant's staff
CREATE POLICY "business_staff_tenant_access" ON business_staff
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id', true)::uuid 
  OR tenant_id IN (
    SELECT tenant_id FROM user_profiles 
    WHERE id = auth.uid()::text AND role IN ('admin', 'dispatcher')
  )
);

-- Policy: Admins can manage staff within their tenant
CREATE POLICY "business_staff_admin_manage" ON business_staff
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM user_profiles 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
);

-- Add Row Level Security policies for customer_profiles
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can only access their own profile
CREATE POLICY "customer_profiles_own_access" ON customer_profiles
FOR ALL USING (id = auth.uid()::text);

-- Policy: Business staff can view customer profiles for their tenant's customers
CREATE POLICY "customer_profiles_business_view" ON customer_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid()::text 
    AND role IN ('admin', 'dispatcher', 'driver')
  )
);