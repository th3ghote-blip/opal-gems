-- Seed data: shops, settings, enum_values.
-- Profiles (Jean, Donna, Elaine, Robin, Grace, owner) are created automatically
-- via the auth trigger the first time each user signs in via magic link.
-- The owner then promotes them via the settings page.

-- 4 shops (Jupiter has 2 showcases)
insert into public.shops (name, hotel_name, address) values
  ('Clearwater',        'Selina Hotel Clearwater', 'Clearwater Beach, FL'),
  ('Opal Grande',       'Opal Grand Resort',       'Delray Beach, FL'),
  ('Jupiter 1',         'Jupiter Beach Resort',    'Jupiter, FL'),
  ('Jupiter 2',         'Jupiter Beach Resort',    'Jupiter, FL')
on conflict do nothing;

-- Settings
insert into public.settings (key, value) values
  ('company_name',                    '"Opal Gems"'::jsonb),
  ('staff_commission_pct',            '2'::jsonb),
  ('max_no_approval_discount_pct',    '10'::jsonb),
  ('reservation_default_hours',       '72'::jsonb),
  ('notification_channel',            '"whatsapp"'::jsonb),
  ('owner_phone',                     '""'::jsonb)
on conflict (key) do nothing;


-- Dropdown seed values
insert into public.enum_values (enum_name, value, sort_order) values
  -- Types
  ('type', 'Necklace',  10),
  ('type', 'Earrings',  20),
  ('type', 'Ring',      30),
  ('type', 'Bracelet',  40),
  ('type', 'Pendant',   50),
  ('type', 'Choker',    60),
  ('type', 'Cross',     70),
  ('type', 'Brooch',    80),
  ('type', 'Anklet',    90),
  ('type', 'Chain',    100),
  ('type', 'Watch',    110),
  ('type', 'Loose',    120),

  -- Metals
  ('metal', 'Yellow Gold',     10),
  ('metal', 'White Gold',      20),
  ('metal', 'Rose Gold',       30),
  ('metal', 'Platinum',        40),
  ('metal', 'Sterling Silver', 50),
  ('metal', 'Mixed Metal',     60),

  -- Karats
  ('karat', '10k',   10),
  ('karat', '14k',   20),
  ('karat', '18k',   30),
  ('karat', '22k',   40),
  ('karat', '24k',   50),
  ('karat', '925',   60),
  ('karat', 'N/A',   70),

  -- Main stones
  ('main_stone', 'Diamond',     10),
  ('main_stone', 'Sapphire',    20),
  ('main_stone', 'Ruby',        30),
  ('main_stone', 'Emerald',     40),
  ('main_stone', 'Opal',        50),
  ('main_stone', 'Pearl',       60),
  ('main_stone', 'Tanzanite',   70),
  ('main_stone', 'Topaz',       80),
  ('main_stone', 'Amethyst',    90),
  ('main_stone', 'Aquamarine', 100),
  ('main_stone', 'Tourmaline', 110),
  ('main_stone', 'Citrine',    120),
  ('main_stone', 'Garnet',     130),
  ('main_stone', 'Morganite',  140),
  ('main_stone', 'Onyx',       150),
  ('main_stone', 'None',       999),

  -- Cuts
  ('stone_cut', 'Round',         10),
  ('stone_cut', 'Princess',      20),
  ('stone_cut', 'Cushion',       30),
  ('stone_cut', 'Oval',          40),
  ('stone_cut', 'Pear',          50),
  ('stone_cut', 'Marquise',      60),
  ('stone_cut', 'Emerald Cut',   70),
  ('stone_cut', 'Heart',         80),
  ('stone_cut', 'Asscher',       90),
  ('stone_cut', 'Radiant',      100),
  ('stone_cut', 'Baguette',     110),

  -- Clarity (diamonds)
  ('clarity', 'FL',    10),
  ('clarity', 'IF',    20),
  ('clarity', 'VVS1',  30),
  ('clarity', 'VVS2',  40),
  ('clarity', 'VS1',   50),
  ('clarity', 'VS2',   60),
  ('clarity', 'SI1',   70),
  ('clarity', 'SI2',   80),
  ('clarity', 'I1',    90),
  ('clarity', 'I2',   100),

  -- Color grade (diamonds)
  ('color_grade', 'D',  10),
  ('color_grade', 'E',  20),
  ('color_grade', 'F',  30),
  ('color_grade', 'G',  40),
  ('color_grade', 'H',  50),
  ('color_grade', 'I',  60),
  ('color_grade', 'J',  70),
  ('color_grade', 'K',  80),

  -- Payment methods
  ('payment_method', 'Check',       10),
  ('payment_method', 'Credit Card', 20),
  ('payment_method', 'Cash',        30),
  ('payment_method', 'Wire',        40)
on conflict (enum_name, value) do nothing;
