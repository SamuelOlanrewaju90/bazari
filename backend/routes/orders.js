const express = require("express");
const crypto = require("crypto");
const { query, pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function serializeOrder(order, items) {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.total_cents,
    createdAt: order.created_at,
    shipping: {
      name: order.shipping_name,
      address: order.shipping_address,
      city: order.shipping_city,
      phone: order.shipping_phone,
    },
    items: items.map((it) => ({ productId: it.product_id, name: it.name, qty: it.qty, priceCents: it.price_cents })),
  };
}

// Place an order from the user's current cart
router.post("/", async (req, res) => {
  const { shipping } = req.body || {};
  if (!shipping || !shipping.address || !shipping.city || !shipping.phone) {
    return res.status(400).json({ error: "Shipping address, city, and phone are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartItems = (await client.query(
      `SELECT c.product_id AS productid, c.qty, p.name, p.price_cents AS pricecents, p.stock
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1 FOR UPDATE OF p`,
      [req.userId]
    )).rows;

    if (cartItems.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Your cart is empty." });
    }

    for (const item of cartItems) {
      if (item.qty > item.stock) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: `Only ${item.stock} units of "${item.name}" are in stock.` });
      }
    }

    const orderId = "BZ-" + crypto.randomBytes(5).toString("hex").toUpperCase();
    const totalCents = cartItems.reduce((sum, item) => sum + item.pricecents * item.qty, 0);

    await client.query(
      `INSERT INTO orders (id, user_id, total_cents, status, shipping_name, shipping_address, shipping_city, shipping_phone)
       VALUES ($1, $2, $3, 'Confirmed', $4, $5, $6, $7)`,
      [orderId, req.userId, totalCents, shipping.name || null, shipping.address, shipping.city, shipping.phone]
    );

    for (const item of cartItems) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, name, qty, price_cents) VALUES ($1, $2, $3, $4, $5)",
        [orderId, item.productid, item.name, item.qty, item.pricecents]
      );
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.qty, item.productid]);
    }

    await client.query("DELETE FROM cart_items WHERE user_id = $1", [req.userId]);

    await client.query("COMMIT");

    const orderRows = await query("SELECT * FROM orders WHERE id = $1", [orderId]);
    const itemRows = await query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
    res.status(201).json({ order: serializeOrder(orderRows[0], itemRows) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Could not place order." });
  } finally {
    client.release();
  }
});

// Order history for the logged-in user
router.get("/", async (req, res) => {
  try {
    const orders = await query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.userId]);
    const results = [];
    for (const order of orders) {
      const items = await query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
      results.push(serializeOrder(order, items));
    }
    res.json({ orders: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load orders." });
  }
});

// Single order (only if it belongs to the logged-in user)
router.get("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM orders WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    if (!rows[0]) return res.status(404).json({ error: "Order not found." });
    const items = await query("SELECT * FROM order_items WHERE order_id = $1", [rows[0].id]);
    res.json({ order: serializeOrder(rows[0], items) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load order." });
  }
});

module.exports = router;
