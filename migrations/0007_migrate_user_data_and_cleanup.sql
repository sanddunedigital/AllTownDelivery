-- Migration 0007: Migrate existing user data to new table structure and cleanup schema
-- This migration moves user data from user_profiles to appropriate business_staff/customer_profiles tables

-- Step 1: Migrate business staff data (users with business roles)
INSERT INTO business_staff (
  id, 
  tenant_id, 
  role, 
  is_on_duty, 
  invite_status, 
  accepted_at, 
  created_at, 
  updated_at,
  permissions
)
SELECT 
  id,
  tenant_id,
  role,
  COALESCE(is_on_duty, false),
  'accepted', -- Existing users are pre-accepted
  created_at, -- Use their creation date as acceptance date
  created_at,
  updated_at,
  '{}'::jsonb -- Empty permissions object
FROM user_profiles 
WHERE role IN ('admin', 'dispatcher', 'driver')
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Step 2: Migrate customer data (users without business roles or with 'customer' role)
INSERT INTO customer_profiles (
  id,
  default_pickup_address,
  default_delivery_address, 
  preferred_payment_method,
  marketing_consent,
  created_at,
  updated_at
)
SELECT 
  id,
  default_pickup_address,
  default_delivery_address,
  preferred_payment_method,
  COALESCE(marketing_consent, false),
  created_at,
  updated_at
FROM user_profiles
WHERE role IS NULL OR role = 'customer' OR role NOT IN ('admin', 'dispatcher', 'driver')
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Step 3: Remove the deprecated columns from user_profiles
ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS role,
DROP COLUMN IF EXISTS is_on_duty,
DROP COLUMN IF EXISTS default_pickup_address,
DROP COLUMN IF EXISTS default_delivery_address,
DROP COLUMN IF EXISTS preferred_payment_method,
DROP COLUMN IF EXISTS marketing_consent;

-- Step 4: Add comment for documentation
COMMENT ON TABLE user_profiles IS 'Base user information shared by all user types (business staff and customers)';
COMMENT ON TABLE business_staff IS 'Business employees: admin, dispatcher, driver roles with tenant isolation';
COMMENT ON TABLE customer_profiles IS 'Delivery service customers with preferences and address data';