const express = require("express");
const { query } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    const conditions = [];
    const params = [];

    if (category && category !== "all") {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`LOWER(name) LIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const products = await query(`SELECT * FROM products ${where} ORDER BY name`, params);
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load products." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Product not found." });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load product." });
  }
});

module.exports = router;
