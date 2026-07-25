const { query, initSchema, pool } = require("../db");

// price_cents here matches the same numeric price shown in the frontend (₦ units),
// kept as an integer "cents" column name for convention only — treat 1 unit = ₦1.
const PRODUCTS = [
  { id: "e1", name: "Wireless Earbuds Pro", category: "electronics", price_cents: 89900, rating: 4.5, stock: 34 },
  { id: "e2", name: "45W Fast Charger", category: "electronics", price_cents: 21500, rating: 4.2, stock: 120 },
  { id: "e3", name: "Bluetooth Speaker Mini", category: "electronics", price_cents: 45000, rating: 4.6, stock: 18 },
  { id: "e4", name: '27" 4K Monitor', category: "electronics", price_cents: 389900, rating: 4.7, stock: 9 },
  { id: "e5", name: "Smartwatch Series X", category: "electronics", price_cents: 156000, rating: 4.3, stock: 27 },
  { id: "f1", name: "Denim Jacket", category: "fashion", price_cents: 65000, rating: 4.1, stock: 40 },
  { id: "f2", name: "Running Sneakers", category: "fashion", price_cents: 78500, rating: 4.4, stock: 55 },
  { id: "f3", name: "Cotton Hoodie", category: "fashion", price_cents: 42000, rating: 4.0, stock: 70 },
  { id: "f4", name: "Leather Handbag", category: "fashion", price_cents: 112000, rating: 4.6, stock: 15 },
  { id: "f5", name: "Classic Sunglasses", category: "fashion", price_cents: 28900, rating: 3.9, stock: 60 },
  { id: "h1", name: "Non-Stick Pan Set", category: "home", price_cents: 54000, rating: 4.3, stock: 22 },
  { id: "h2", name: "Memory Foam Pillow", category: "home", price_cents: 32000, rating: 4.5, stock: 48 },
  { id: "h3", name: "LED Desk Lamp", category: "home", price_cents: 27500, rating: 4.2, stock: 33 },
  { id: "h4", name: "6-Seater Dining Set", category: "home", price_cents: 445000, rating: 4.7, stock: 6 },
  { id: "b1", name: "Vitamin C Serum", category: "beauty", price_cents: 31000, rating: 4.4, stock: 90 },
  { id: "b2", name: "Matte Lipstick Set", category: "beauty", price_cents: 24500, rating: 4.1, stock: 65 },
  { id: "b3", name: "Argan Hair Oil", category: "beauty", price_cents: 18900, rating: 4.3, stock: 80 },
  { id: "g1", name: "Extra Virgin Olive Oil 1L", category: "groceries", price_cents: 15500, rating: 4.6, stock: 150 },
  { id: "g2", name: "Basmati Rice 5kg", category: "groceries", price_cents: 22000, rating: 4.5, stock: 200 },
  { id: "g3", name: "Roasted Coffee Beans", category: "groceries", price_cents: 19800, rating: 4.7, stock: 110 },
  { id: "s1", name: "Yoga Mat", category: "sports", price_cents: 26500, rating: 4.2, stock: 45 },
  { id: "s2", name: "Adjustable Dumbbells", category: "sports", price_cents: 168000, rating: 4.6, stock: 12 },
  { id: "s3", name: "Football Size 5", category: "sports", price_cents: 21000, rating: 4.0, stock: 38 },
  { id: "s4", name: "Cycling Helmet", category: "sports", price_cents: 47500, rating: 4.4, stock: 26 },
];

async function main() {
  await initSchema();
  for (const p of PRODUCTS) {
    await query(
      `INSERT INTO products (id, name, category, price_cents, rating, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name, category = excluded.category, price_cents = excluded.price_cents,
         rating = excluded.rating, stock = excluded.stock`,
      [p.id, p.name, p.category, p.price_cents, p.rating, p.stock]
    );
  }
  console.log(`Seeded ${PRODUCTS.length} products.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
