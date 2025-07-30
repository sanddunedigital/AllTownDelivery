-- Migration: Remove deliveryType column from delivery_requests table
-- Date: 2025-07-30
-- Description: The deliveryType field doesn't fit Sara's Quickie Delivery service model

ALTER TABLE delivery_requests DROP COLUMN IF EXISTS delivery_type;