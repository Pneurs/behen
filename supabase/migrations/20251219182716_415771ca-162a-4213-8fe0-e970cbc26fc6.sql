-- Add negotiation_allowed column to products table
ALTER TABLE products ADD COLUMN negotiation_allowed BOOLEAN DEFAULT true;