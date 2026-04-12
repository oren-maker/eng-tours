-- ============================================
-- ENG Tours - Full Database Schema
-- Version 1.0 | April 2026
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS (admins & suppliers)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'supplier')),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  whatsapp_number TEXT,
  display_name TEXT,
  is_primary_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. EVENTS
-- ============================================
CREATE TABLE events (
  id VARCHAR(7) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type_code TEXT NOT NULL CHECK (type_code IN ('RF', 'FL', 'RL', 'IL', 'FI')),
  start_date DATE,
  end_date DATE,
  min_age INT,
  max_age INT,
  mode TEXT NOT NULL DEFAULT 'payment' CHECK (mode IN ('registration', 'payment')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  waiting_list_enabled BOOLEAN DEFAULT false,
  reminder_days INT[] DEFAULT '{7,2}',
  low_stock_threshold INT DEFAULT 10,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. FLIGHTS
-- ============================================
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id) ON DELETE CASCADE,
  airline_name TEXT,
  flight_code TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  origin_city TEXT,
  origin_iata CHAR(3),
  dest_city TEXT,
  dest_iata CHAR(3),
  total_seats INT,
  booked_seats INT DEFAULT 0,
  price_company DECIMAL(10,2),
  price_customer DECIMAL(10,2),
  transfer_company TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 4. HOTELS
-- ============================================
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  stars INT CHECK (stars BETWEEN 1 AND 5),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 5. ROOMS
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  event_id VARCHAR(7) REFERENCES events(id) ON DELETE CASCADE,
  check_in DATE,
  check_out DATE,
  room_type TEXT,
  price_company DECIMAL(10,2),
  price_customer DECIMAL(10,2),
  capacity INT,
  total_rooms INT,
  booked_rooms INT DEFAULT 0
);

-- ============================================
-- 6. TICKETS
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  price_customer DECIMAL(10,2),
  price_company DECIMAL(10,2),
  external_url TEXT,
  payment_type TEXT CHECK (payment_type IN ('credit', 'installments', 'bank', 'free')),
  total_qty INT,
  booked_qty INT DEFAULT 0
);

-- ============================================
-- 7. PACKAGES
-- ============================================
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  service_level TEXT,
  price_total DECIMAL(10,2),
  flight_id UUID REFERENCES flights(id),
  room_id UUID REFERENCES rooms(id),
  ticket_id UUID REFERENCES tickets(id)
);

-- ============================================
-- 8. ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id),
  share_token UUID UNIQUE DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_payment', 'partial', 'completed',
    'supplier_review', 'supplier_approved', 'confirmed', 'cancelled'
  )),
  mode TEXT CHECK (mode IN ('registration', 'payment')),
  total_price DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  supplier_viewed_at TIMESTAMPTZ,
  supplier_approved_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. PARTICIPANTS
-- ============================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  first_name_en TEXT,
  last_name_en TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  birth_date DATE,
  age_at_event INT,
  phone TEXT,
  email TEXT,
  passport_image_url TEXT,
  flight_id UUID REFERENCES flights(id),
  room_id UUID REFERENCES rooms(id),
  ticket_id UUID REFERENCES tickets(id),
  package_id UUID REFERENCES packages(id),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_token UUID UNIQUE DEFAULT uuid_generate_v4()
);

-- ============================================
-- 10. SUPPLIER CONFIRMATIONS
-- ============================================
CREATE TABLE supplier_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'room', 'ticket')),
  item_id UUID NOT NULL,
  confirmation_number TEXT,
  notes TEXT,
  has_issue BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. COUPONS
-- ============================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'order' CHECK (applies_to IN ('order', 'flight', 'room', 'ticket')),
  max_uses INT,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 12. WAITING LIST
-- ============================================
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(7) REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  position INT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 13. WHATSAPP LOG
-- ============================================
CREATE TABLE whatsapp_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  recipient_type TEXT CHECK (recipient_type IN ('admin', 'supplier', 'customer')),
  recipient_number TEXT,
  template_name TEXT,
  message_body TEXT,
  status TEXT CHECK (status IN ('sent', 'delivered', 'failed')),
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 14. AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 15. FAQ
-- ============================================
CREATE TABLE faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT,
  helpful_yes INT DEFAULT 0,
  helpful_no INT DEFAULT 0
);

-- ============================================
-- 16. SYSTEM SETTINGS (key-value)
-- ============================================
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 17. WHATSAPP TEMPLATES
-- ============================================
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_flights_event ON flights(event_id);
CREATE INDEX idx_rooms_event ON rooms(event_id);
CREATE INDEX idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_packages_event ON packages(event_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_share_token ON orders(share_token);
CREATE INDEX idx_participants_order ON participants(order_id);
CREATE INDEX idx_participants_payment_token ON participants(payment_token);
CREATE INDEX idx_supplier_confirmations_order ON supplier_confirmations(order_id);
CREATE INDEX idx_waiting_list_event ON waiting_list(event_id);
CREATE INDEX idx_whatsapp_log_order ON whatsapp_log(order_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_coupons_code ON coupons(code);

-- ============================================
-- DEFAULT DATA: System Settings
-- ============================================
INSERT INTO system_settings (key, value) VALUES
  ('low_stock_threshold', '10'),
  ('reminder_days_before', '7,2'),
  ('session_duration_days', '30'),
  ('2fa_enabled', 'true'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'האתר בתחזוקה זמנית'),
  ('backup_enabled', 'true'),
  ('sender_email', 'noreply@eng-tours.com'),
  ('wesender_number', ''),
  ('default_currency', 'ILS');

-- ============================================
-- DEFAULT DATA: FAQ
-- ============================================
INSERT INTO faq (question, answer, sort_order) VALUES
  ('איך מבצעים הזמנה?', 'בחרו אירוע, מלאו פרטים, בחרו טיסה/חדר/כרטיס ועברו לתשלום. בסיום תקבלו אישור במייל וב-WhatsApp.', 1),
  ('האם ניתן להזמין עבור כמה אנשים?', 'כן. בחרו כמות משתתפים בתחילת הטופס ותפתח שורת פרטים לכל אחד.', 2),
  ('מה קורה אחרי הגשת ההזמנה?', 'תקבלו אישור במייל. לאחר אישור סופי, תקבלו WhatsApp עם כל פרטי הנסיעה.', 3),
  ('האם ניתן לשלם בתשלומים?', 'תלוי באירוע. אפשרויות התשלום מוצגות בשלב התשלום.', 4),
  ('מדוע נדרש צילום דרכון?', 'הדרכון נדרש לרישום אצל חברת התעופה. הפרטים מאובטחים ומשמשים לצורך הנסיעה בלבד.', 5),
  ('מה קורה אם הדרכון שלי פג תוקף?', 'יש לוודא תוקף דרכון לפחות 6 חודשים מתאריך החזרה. פנו אלינו אם יש בעיה.', 6),
  ('האם ניתן לשנות פרטים אחרי ההזמנה?', 'שינויים מתבצעים דרך הצוות שלנו. חלק מהשינויים עלולים לכרוך עלות נוספת.', 7),
  ('לא קיבלתי מייל אישור – מה עושים?', 'בדקו תיקיית ספאם. אם לא הגיע תוך 10 דקות, פנו אלינו עם מספר ההזמנה.', 8),
  ('איך מתבצע תשלום חלקי בקבוצה?', 'כל משתתף מקבל קישור אישי לתשלום חלקו בנפרד.', 9),
  ('האם המידע שלי מאובטח?', 'כן. כל הפרטים מאוחסנים בשרתים מאובטחים ומשמשים לצורך הנסיעה בלבד.', 10);

-- ============================================
-- DEFAULT DATA: WhatsApp Templates
-- ============================================
INSERT INTO whatsapp_templates (name, body, variables) VALUES
  ('new_order', 'הזמנה חדשה #{{id}} לאירוע {{event_name}}', ARRAY['id', 'event_name']),
  ('partial_payment', 'משתתף שילם – הזמנה #{{id}} עדיין לא הושלמה', ARRAY['id']),
  ('low_stock', 'נשארו {{n}} מקומות ב-{{item_name}}', ARRAY['n', 'item_name']),
  ('backup_failed', 'גיבוי אוטומטי נכשל – {{date}}', ARRAY['date']),
  ('order_pending_supplier', 'הזמנה #{{id}} – ממתינה לאישורך {{link}}', ARRAY['id', 'link']),
  ('supplier_approved', 'ספק {{name}} אישר הזמנה #{{id}}', ARRAY['name', 'id']),
  ('supplier_issue', 'ספק {{name}} דיווח על בעיה בהזמנה #{{id}}', ARRAY['name', 'id']),
  ('order_confirmed_customer', 'הזמנתך אושרה! ראה פרטים: {{link}}', ARRAY['link']),
  ('order_confirmed_airline', 'אישור הזמנת נוסעים – מספר {{confirmation}}', ARRAY['confirmation']),
  ('event_reminder', '{{n}} ימים לפני האירוע – פרטי נסיעתך: {{link}}', ARRAY['n', 'link']),
  ('2fa_code', 'קוד האימות שלך: {{code}} – תקף 5 דקות', ARRAY['code']),
  ('waiting_list_available', 'התפנה מקום! הזמן עכשיו: {{link}}', ARRAY['link']);

-- ============================================
-- DEFAULT ADMIN USER (password: admin123 - CHANGE IN PRODUCTION)
-- bcrypt hash for 'admin123'
-- ============================================
INSERT INTO users (id, role, email, phone, password_hash, display_name, is_primary_admin, is_active)
VALUES (
  uuid_generate_v4(),
  'admin',
  'oren@bin.co.il',
  '',
  '$2b$12$LJ3kcPZzpGqsGdPXQkMPJ.3LYnRCjKvB7tXQHmvqfR7pDJmVK.Yq2',
  'אורן',
  true,
  true
);
