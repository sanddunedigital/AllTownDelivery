-- Add Square payment configuration fields to business_settings table
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS square_access_token text,
ADD COLUMN IF NOT EXISTS square_application_id text,
ADD COLUMN IF NOT EXISTS square_location_id text,
ADD COLUMN IF NOT EXISTS square_environment text DEFAULT 'sandbox';