-- Create credit_limit_history table to track credit limit adjustments
CREATE TABLE IF NOT EXISTS retailer_credit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    credit_limit_before NUMERIC(10, 2) NOT NULL,
    credit_limit_after NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    processed_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by retailer
CREATE INDEX IF NOT EXISTS idx_credit_history_retailer_id ON retailer_credit_history(retailer_id);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_credit_history_created_at ON retailer_credit_history(created_at DESC);

-- Add RLS policies
ALTER TABLE retailer_credit_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all credit history
CREATE POLICY "Admins can view all credit history"
    ON retailer_credit_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can insert credit history
CREATE POLICY "Admins can insert credit history"
    ON retailer_credit_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE retailer_credit_history IS 'Audit trail for credit limit adjustments';
COMMENT ON COLUMN retailer_credit_history.adjustment_type IS 'Type of adjustment: increase or decrease';
COMMENT ON COLUMN retailer_credit_history.amount IS 'Amount of the adjustment';
COMMENT ON COLUMN retailer_credit_history.credit_limit_before IS 'Credit limit before the adjustment';
COMMENT ON COLUMN retailer_credit_history.credit_limit_after IS 'Credit limit after the adjustment';
COMMENT ON COLUMN retailer_credit_history.processed_by IS 'Admin who processed the adjustment';
