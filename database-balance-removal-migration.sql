-- Migration: Add balance removal functionality to deposits system
-- Date: 2025-10-28
-- Purpose: Allow admins to remove balances using the same deposit modal with Add/Remove toggle

-- Add adjustment_type column to retailer_deposits table
ALTER TABLE retailer_deposits 
ADD COLUMN IF NOT EXISTS adjustment_type TEXT NOT NULL DEFAULT 'deposit' 
CHECK (adjustment_type IN ('deposit', 'removal'));

-- Add index for faster filtering by adjustment type
CREATE INDEX IF NOT EXISTS idx_retailer_deposits_adjustment_type ON retailer_deposits(adjustment_type);

-- Add comment
COMMENT ON COLUMN retailer_deposits.adjustment_type IS 'Type of balance adjustment: deposit (adds balance) or removal (removes balance)';
