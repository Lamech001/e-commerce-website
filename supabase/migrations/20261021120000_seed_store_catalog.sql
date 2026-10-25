insert into public.products (
  id, name, sku, brand, product_type, gender, price, original_price, stock,
  image_url, colors, sizes, rating, reviews, badge, badge_color, is_new,
  is_sale, units_sold
)
values
  (1, 'Oversized Linen Blazer', 'ARK-BLZ-OVS-W', 'Arket', 'Clothing', 'Women', 189.00, null, 24, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&h=600&fit=crop&auto=format', array['#e8e4df', '#1a1a1a', '#c4a882'], array['XS', 'S', 'M', 'L', 'XL'], 4.8, 312, 'New', '#2563eb', true, false, 0),
  (2, 'Air Max Pulse Trainers', 'NIK-AMP-UNI-08', 'Nike', 'Shoes', 'Unisex', 134.95, 179.95, 8, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=600&fit=crop&auto=format', array['#f97316', '#ffffff', '#0f172a'], array['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], 4.9, 1840, 'Sale', '#dc2626', false, true, 0),
  (3, 'Mini Leather Crossbody', 'MNG-MCB-BLK-OS', 'Mango', 'Bags', 'Women', 79.99, null, 41, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&h=600&fit=crop&auto=format', array['#c4a882', '#0f172a', '#dc2626'], array['One Size'], 4.7, 528, 'Best Seller', '#7c3aed', false, false, 0),
  (4, 'Slim-Fit Chino Trousers', 'COS-CHN-SLM-M', 'COS', 'Clothing', 'Men', 95.00, 130.00, 55, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&h=600&fit=crop&auto=format', array['#c4a882', '#1a1a1a', '#4b5563'], array['28', '30', '32', '34', '36'], 4.5, 672, 'Sale', '#dc2626', false, true, 0),
  (5, 'Stan Smith Sneakers', 'ADI-SSM-UNI-09', 'Adidas', 'Shoes', 'Unisex', 89.99, null, 120, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&h=600&fit=crop&auto=format', array['#ffffff', '#0f172a'], array['UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'], 4.8, 4201, 'Classic', '#16a34a', false, false, 0),
  (6, 'Canvas Tote Shopper', 'TTM-CTS-CRM-OS', 'Toteme', 'Bags', 'Women', 145.00, null, 33, 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500&h=600&fit=crop&auto=format', array['#e8e4df', '#0f172a'], array['One Size'], 4.6, 219, 'New', '#2563eb', true, false, 0),
  (7, 'Ribbed Merino Sweater', 'ARK-RMS-GRY-M', 'Arket', 'Clothing', 'Men', 115.00, 160.00, 18, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&h=600&fit=crop&auto=format', array['#4b5563', '#c4a882', '#1a1a1a'], array['XS', 'S', 'M', 'L', 'XL', 'XXL'], 4.7, 445, 'Sale', '#dc2626', false, true, 0),
  (8, 'Mary Jane Ballet Flats', 'MSD-MJB-BLK-38', 'Massimo Dutti', 'Shoes', 'Women', 129.00, null, 14, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&h=600&fit=crop&auto=format', array['#0f172a', '#c4a882', '#dc2626'], array['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40'], 4.9, 387, 'New', '#2563eb', true, false, 0),
  (9, 'Structured Work Tote', 'MNG-SWT-BLK-OS', 'Mango', 'Bags', 'Women', 59.99, 89.99, 62, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&h=600&fit=crop&auto=format', array['#0f172a', '#c4a882'], array['One Size'], 4.6, 891, 'Sale', '#dc2626', false, true, 0),
  (10, 'Denim Straight Jeans', 'LEV-DSJ-IND-28', 'Levi''s', 'Clothing', 'Women', 99.95, null, 87, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=600&fit=crop&auto=format', array['#4b5563', '#0f172a', '#93c5fd'], array['24', '26', '28', '30', '32', '34'], 4.7, 2310, 'Best Seller', '#7c3aed', false, false, 0),
  (11, 'Kids Colour-Block Puffer', 'HNM-KCB-PUF-K', 'H&M', 'Clothing', 'Kids', 49.99, 69.99, 44, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500&h=600&fit=crop&auto=format', array['#2563eb', '#dc2626', '#16a34a'], array['3-4Y', '5-6Y', '7-8Y', '9-10Y'], 4.5, 183, 'Sale', '#dc2626', false, true, 0),
  (12, 'Gold Hoop Earrings', 'MEJ-GHE-GLD-OS', 'Mejuri', 'Accessories', 'Women', 68.00, null, 95, 'https://images.unsplash.com/photo-1631461717087-5de7e0fd9cff?w=500&h=600&fit=crop&auto=format', array['#d4af37', '#c0c0c0'], array['One Size'], 4.9, 1120, 'New', '#2563eb', true, false, 0)
on conflict (id) do nothing;

select setval(
  pg_get_serial_sequence('public.products', 'id'),
  greatest((select coalesce(max(id), 1) from public.products), 1),
  true
);

insert into public.promotions (
  code, discount_type, discount_value, minimum_subtotal, usage_limit,
  usage_count, starts_at, expires_at, is_active
)
values
  ('SUMMER30', 'percentage', 30, 100, 800, 0, now(), '2027-08-31 23:59:59+00', true),
  ('NEWSTYLE', 'percentage', 15, 0, null, 0, now(), '2027-12-31 23:59:59+00', true),
  ('FREESHIP', 'free_shipping', 0, 60, 2000, 0, now(), '2027-07-31 23:59:59+00', true),
  ('FLASH40', 'percentage', 40, 150, 100, 0, now(), '2027-07-22 23:59:59+00', true)
on conflict (code) do nothing;
