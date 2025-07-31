-- Migration: Add driver status field to user_profiles table
-- Date: 2025-07-30
-- Description: Allow drivers to go on-duty/off-duty for better workflow management

ALTER TABLE user_profiles ADD COLUMN driver_status TEXT DEFAULT 'off-duty';