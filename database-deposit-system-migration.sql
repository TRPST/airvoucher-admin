-- Migration: Add deposit fee configurations and retailer deposits tracking
-- Date: 2025-10-27

-- Create deposit_fee_configurations table
CREATE TABLE IF NOT EXISTS deposit_fee_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_method TEXT NOT NULL CHECK (deposit_method IN ('EFT', 'ATM', 'Counter', 'Branch')),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('fixed', 'percentage')),
  fee_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deposit_method)
);

-- Create retailer_deposits table for audit trail
CREATE TABLE IF NOT EXISTS retailer_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  amount_deposited DECIMAL(10,2) NOT NULL,
  deposit_method TEXT NOT NULL CHECK (deposit_method IN ('EFT', 'ATM', 'Counter', 'Branch')),
  fee_type TEXT NOT NULL,
  fee_value DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  processed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on retailer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_retailer_deposits_retailer_id ON retailer_deposits(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_deposits_created_at ON retailer_deposits(created_at DESC);

-- Insert default deposit fee configurations (all at 0)
INSERT INTO deposit_fee_configurations (deposit_method, fee_type, fee_value) VALUES
('EFT', 'fixed', 0),
('ATM', 'fixed', 0),
('Counter', 'fixed', 0),
('Branch', 'fixed', 0)
ON CONFLICT (deposit_method) DO NOTHING;

-- Add comment to tables
COMMENT ON TABLE deposit_fee_configurations IS 'Stores deposit fee configurations for different deposit methods';
COMMENT ON TABLE retailer_deposits IS 'Audit trail for all retailer balance deposits';
