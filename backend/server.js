require("dotenv").config();
const express = require("express");
const cors = require("cors");

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in your .env file. Copy .env.example to .env and set one.");
  process.exit(1);
}

const { initSchema } = require("./db");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 4000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Bazari backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to set up database schema:", err);
    process.exit(1);
  });
