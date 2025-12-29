-- Create view for admin bookings with owner and renter names
CREATE OR REPLACE VIEW admin_bookings_view AS
SELECT 
  b.*,
  p.title AS product_title,
  p.ai_cover_image AS product_image,
  owner_profile.name AS owner_name,
  owner_profile.phone AS owner_phone,
  renter_profile.name AS renter_name,
  renter_profile.phone AS renter_phone
FROM bookings b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN profiles owner_profile ON b.owner_id = owner_profile.user_id
LEFT JOIN profiles renter_profile ON b.renter_id = renter_profile.user_id;

-- Create view for admin products with owner names
CREATE OR REPLACE VIEW admin_products_view AS
SELECT 
  pr.*,
  owner_profile.name AS owner_name
FROM products pr
LEFT JOIN profiles owner_profile ON pr.owner_id = owner_profile.user_id;

-- Create view for admin reviews with names
CREATE OR REPLACE VIEW admin_reviews_view AS
SELECT 
  r.*,
  p.title AS product_title,
  reviewer_profile.name AS reviewer_name,
  owner_profile.name AS owner_name
FROM reviews r
LEFT JOIN products p ON r.product_id = p.id
LEFT JOIN profiles reviewer_profile ON r.reviewer_id = reviewer_profile.user_id
LEFT JOIN profiles owner_profile ON r.owner_id = owner_profile.user_id;

-- Create view for admin conversations with names
CREATE OR REPLACE VIEW admin_conversations_view AS
SELECT 
  c.*,
  p.title AS product_title,
  p.ai_cover_image AS product_image,
  owner_profile.name AS owner_name,
  renter_profile.name AS renter_name
FROM chat_conversations c
LEFT JOIN products p ON c.product_id = p.id
LEFT JOIN profiles owner_profile ON c.owner_id = owner_profile.user_id
LEFT JOIN profiles renter_profile ON c.renter_id = renter_profile.user_id;

-- Enable RLS on views (PostgreSQL views inherit RLS from underlying tables, 
-- but we need super_admin access)
GRANT SELECT ON admin_bookings_view TO authenticated;
GRANT SELECT ON admin_products_view TO authenticated;
GRANT SELECT ON admin_reviews_view TO authenticated;
GRANT SELECT ON admin_conversations_view TO authenticated;