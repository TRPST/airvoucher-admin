-- Migration: Add contact phone number fields to retailers table
-- Date: 2025-01-17
-- Description: Adds contact_phone and secondary_contact_phone columns to the retailers table
--              to store phone numbers for the primary and secondary contact persons.

-- Add phone number columns to retailers table
ALTER TABLE retailers 
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS secondary_contact_phone VARCHAR(50);

-- Add comments to document the new columns
COMMENT ON COLUMN retailers.contact_phone IS 'Phone number for the primary contact person';
COMMENT ON COLUMN retailers.secondary_contact_phone IS 'Phone number for the secondary contact person';
