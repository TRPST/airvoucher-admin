-- Migration to add serial_number and imei_number columns to terminals table
-- These are optional fields to track device hardware information

-- Add serial_number column
ALTER TABLE terminals
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Add imei_number column
ALTER TABLE terminals
ADD COLUMN IF NOT EXISTS imei_number TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN terminals.serial_number IS 'Optional serial number of the terminal device';
COMMENT ON COLUMN terminals.imei_number IS 'Optional IMEI number of the terminal device';
