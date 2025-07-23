-- Step 1: Add new columns to voucher_types table
ALTER TABLE voucher_types 
ADD COLUMN IF NOT EXISTS redemption_instructions TEXT,
ADD COLUMN IF NOT EXISTS help_instructions TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Step 2: Update existing voucher types with sample data
-- You can customize these based on your actual voucher types

-- Vodacom vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Dial *135*(voucher number)# from your Vodacom phone',
  help_instructions = 'For help, dial 135 or visit a Vodacom store',
  website_url = 'www.vodacom.co.za'
WHERE name ILIKE '%vodacom%';

-- MTN vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Dial *136*(voucher number)# from your MTN phone',
  help_instructions = 'For help, dial 136 or visit an MTN store', 
  website_url = 'www.mtn.co.za'
WHERE name ILIKE '%mtn%';

-- Telkom vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Dial *180*(voucher number)# from your Telkom phone',
  help_instructions = 'For help, dial 180 or visit a Telkom store',
  website_url = 'www.telkom.co.za' 
WHERE name ILIKE '%telkom%';

-- Cell C vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Dial *102*(voucher number)# from your Cell C phone',
  help_instructions = 'For help, dial 102 or visit a Cell C store',
  website_url = 'www.cellc.co.za'
WHERE name ILIKE '%cellc%' OR name ILIKE '%cell c%';

-- Hollywoodbets vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Visit www.hollywoodbets.net and enter code in "Deposit" section',
  help_instructions = 'Help: 087 353 7634',
  website_url = 'www.hollywoodbets.net'
WHERE name ILIKE '%hollywood%';

-- Netflix vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Visit netflix.com/redeem and enter your voucher code',
  help_instructions = 'For help, visit netflix.com/help',
  website_url = 'www.netflix.com'
WHERE name ILIKE '%netflix%';

-- Showmax vouchers  
UPDATE voucher_types 
SET 
  redemption_instructions = 'Visit showmax.com/redeem and enter your voucher code',
  help_instructions = 'For help, visit showmax.com/help',
  website_url = 'www.showmax.com'
WHERE name ILIKE '%showmax%';

-- OTT vouchers
UPDATE voucher_types 
SET 
  redemption_instructions = 'Visit www.ottvoucher.co.za and enter voucher code',
  help_instructions = 'For help, contact OTT support',
  website_url = 'www.ottvoucher.co.za'
WHERE name ILIKE '%ott%';

-- Default fallback for any remaining vouchers without instructions
UPDATE voucher_types 
SET 
  redemption_instructions = 'Follow the instructions provided with your voucher',
  help_instructions = 'Contact customer support for assistance',
  website_url = 'www.airvoucher.co.za'
WHERE redemption_instructions IS NULL;
