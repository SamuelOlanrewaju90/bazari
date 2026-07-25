const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in your .env file. See README.md for how to get a free Postgres database.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      qty INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Confirmed',
      shipping_name TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price_cents INTEGER NOT NULL
    );
  `);
}

module.exports = { pool, query, initSchema };
