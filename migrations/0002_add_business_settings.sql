-- Migration: Add business settings and service zones tables
-- This adds customizable pricing, branding, and operational settings for each tenant

-- Business settings table for tenant customization
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
  
  -- Pricing Configuration
  base_delivery_fee numeric(10,2) DEFAULT 5.00,
  urgent_delivery_fee numeric(10,2) DEFAULT 10.00,
  free_delivery_threshold numeric(10,2),
  loyalty_points_per_dollar integer DEFAULT 1,
  points_for_free_delivery integer DEFAULT 10,
  
  -- Service Configuration  
  max_delivery_radius_miles integer DEFAULT 25,
  average_delivery_time_minutes integer DEFAULT 30,
  operating_hours jsonb,
  
  -- Branding & Contact
  business_phone text,
  business_email text,
  business_address text,
  website_url text,
  social_media_links jsonb,
  
  -- Service Features
  enable_real_time_tracking boolean DEFAULT true,
  enable_loyalty_program boolean DEFAULT true,
  enable_scheduled_deliveries boolean DEFAULT false,
  enable_multi_stop_deliveries boolean DEFAULT false,
  
  -- Payment Options
  accepted_payment_methods text[] DEFAULT ARRAY['cash', 'credit_card', 'digital_wallet'],
  require_payment_upfront boolean DEFAULT false,
  
  -- Notifications
  customer_notifications jsonb DEFAULT '{"sms": true, "email": true, "push": false}',
  
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Service area zones for delivery pricing
CREATE TABLE IF NOT EXISTS service_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
  name text NOT NULL,
  description text,
  delivery_fee numeric(10,2) NOT NULL,
  estimated_time_minutes integer NOT NULL,
  is_active boolean DEFAULT true,
  zip_codes text[],
  boundaries jsonb,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Create default business settings for Sara's Quickie Delivery
INSERT INTO business_settings (
  tenant_id,
  base_delivery_fee,
  urgent_delivery_fee,
  loyalty_points_per_dollar,
  points_for_free_delivery,
  max_delivery_radius_miles,
  average_delivery_time_minutes,
  business_phone,
  business_email,
  business_address,
  website_url,
  operating_hours,
  enable_real_time_tracking,
  enable_loyalty_program,
  enable_scheduled_deliveries,
  accepted_payment_methods,
  customer_notifications
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  5.00,
  10.00,
  1,
  10,
  25,
  30,
  '(641) 670-0468',
  'sarasquickiedelivery@gmail.com',
  '1004 A Ave E, Oskaloosa, IA 52577',
  'https://sarasquickiedelivery.com',
  '{
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday": {"open": "09:00", "close": "18:00"},
    "friday": {"open": "09:00", "close": "18:00"},
    "saturday": {"open": "10:00", "close": "16:00"},
    "sunday": {"closed": true}
  }',
  true,
  true,
  false,
  ARRAY['cash', 'credit_card', 'digital_wallet'],
  '{"sms": true, "email": true, "push": false}'
);

-- Create default service zones for Sara's Quickie
INSERT INTO service_zones (tenant_id, name, description, delivery_fee, estimated_time_minutes, zip_codes) VALUES
('00000000-0000-0000-0000-000000000001', 'Oskaloosa City', 'Downtown Oskaloosa and surrounding neighborhoods', 5.00, 20, ARRAY['52577']),
('00000000-0000-0000-0000-000000000001', 'Extended Area', 'Outlying areas and nearby towns', 8.00, 45, ARRAY['52531', '52544', '52563']);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_settings_tenant_id ON business_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_zones_tenant_id ON service_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_zones_active ON service_zones(tenant_id, is_active);