-- schema.sql — Jibuy database (SQLite; portable to PostgreSQL with minor type changes)
-- Applied automatically by server.js on start-up. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  brand        TEXT NOT NULL,
  category     TEXT NOT NULL,
  price        INTEGER NOT NULL CHECK (price > 0),       -- naira
  old_price    INTEGER,
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  rating       REAL NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  location     TEXT NOT NULL DEFAULT 'Lagos',
  verified     INTEGER NOT NULL DEFAULT 0,
  featured     INTEGER NOT NULL DEFAULT 0,
  description  TEXT NOT NULL DEFAULT '',
  images       TEXT NOT NULL DEFAULT '[]',               -- JSON array
  features     TEXT NOT NULL DEFAULT '[]',               -- JSON array
  variants     TEXT,                                     -- JSON {label, options[]} or NULL
  tags         TEXT NOT NULL DEFAULT '[]',               -- JSON array
  created      INTEGER NOT NULL                          -- epoch milliseconds
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products (price);

CREATE TABLE IF NOT EXISTS coupons (
  id     TEXT PRIMARY KEY,
  code   TEXT NOT NULL UNIQUE,
  type   TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'shipping')),
  value  INTEGER NOT NULL DEFAULT 0,
  min    INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  note   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,                                    -- signed-in customer who placed it
  email         TEXT NOT NULL,
  cust_name     TEXT NOT NULL,
  cust_phone    TEXT NOT NULL,
  cust_address  TEXT NOT NULL,
  cust_city     TEXT NOT NULL,
  cust_state    TEXT NOT NULL,
  subtotal      INTEGER NOT NULL,
  discount      INTEGER NOT NULL DEFAULT 0,
  delivery      INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL,
  coupon        TEXT,
  payment       TEXT NOT NULL CHECK (payment IN ('card', 'transfer', 'cod')),
  status        TEXT NOT NULL DEFAULT 'Processing'
                CHECK (status IN ('Processing', 'Awaiting delivery', 'Shipped', 'Delivered', 'Cancelled')),
  created       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_email   ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name       TEXT NOT NULL,        -- snapshot, so history survives product edits
  variant    TEXT NOT NULL DEFAULT '',
  price      INTEGER NOT NULL,     -- unit price at time of purchase
  qty        INTEGER NOT NULL CHECK (qty > 0),
  image      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items (order_id);

-- Customer accounts and server-side sessions -------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,                       -- stored lower-case
  pw_hash    TEXT,                                       -- scrypt hash (NULL for Google-only accounts)
  pw_salt    TEXT,
  google_sub TEXT,
  picture    TEXT NOT NULL DEFAULT '',
  created    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,                           -- SHA-256 of the cookie token; the raw token is never stored
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires    INTEGER NOT NULL,
  created    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);
CREATE INDEX IF NOT EXISTS idx_orders_user      ON orders (user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT NOT NULL,
  created    INTEGER NOT NULL,
  UNIQUE (product_id, user_id)                           -- one review per customer per product
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id, created);
