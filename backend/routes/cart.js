const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function getCartWithProducts(userId) {
  return query(
    `SELECT c.product_id AS "productId", c.qty, p.name, p.price_cents AS "priceCents", p.category, p.stock
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = $1`,
    [userId]
  );
}

router.get("/", async (req, res) => {
  try {
    res.json({ items: await getCartWithProducts(req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load cart." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { productId, qty } = req.body || {};
    const addQty = Number.isInteger(qty) && qty > 0 ? qty : 1;

    const productRows = await query("SELECT * FROM products WHERE id = $1", [productId]);
    if (!productRows[0]) return res.status(404).json({ error: "Product not found." });

    await query(
      `INSERT INTO cart_items (user_id, product_id, qty) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET qty = cart_items.qty + $3`,
      [req.userId, productId, addQty]
    );
    res.status(201).json({ items: await getCartWithProducts(req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add item to cart." });
  }
});

router.patch("/:productId", async (req, res) => {
  try {
    const { qty } = req.body || {};
    if (!Number.isInteger(qty)) return res.status(400).json({ error: "qty must be an integer." });

    if (qty <= 0) {
      await query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [req.userId, req.params.productId]);
    } else {
      const result = await query(
        "UPDATE cart_items SET qty = $1 WHERE user_id = $2 AND product_id = $3 RETURNING id",
        [qty, req.userId, req.params.productId]
      );
      if (result.length === 0) return res.status(404).json({ error: "Item not in cart." });
    }
    res.json({ items: await getCartWithProducts(req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update cart." });
  }
});

router.delete("/:productId", async (req, res) => {
  try {
    await query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [req.userId, req.params.productId]);
    res.json({ items: await getCartWithProducts(req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update cart." });
  }
});

module.exports = router;
