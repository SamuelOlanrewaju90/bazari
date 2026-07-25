const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "A valid email is required." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

    const normalizedEmail = email.trim().toLowerCase();
    const existingRows = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existingRows.length > 0) return res.status(409).json({ error: "An account with this email already exists." });

    const id = "u-" + crypto.randomBytes(8).toString("hex");
    const passwordHash = await bcrypt.hash(password, 10);

    await query("INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)", [id, name.trim(), normalizedEmail, passwordHash]);

    const user = { id, name: name.trim(), email: normalizedEmail };
    const token = signToken(id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const normalizedEmail = email.trim().toLowerCase();
    const rows = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const token = signToken(user.id);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not sign in." });
  }
});

module.exports = router;
