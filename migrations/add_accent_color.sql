-- Add accent color column to business_settings table
ALTER TABLE business_settings 
ADD COLUMN accent_color TEXT DEFAULT '#ea580c';