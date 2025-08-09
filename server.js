// server.js
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email",
      [email, hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (result.rows.length === 0) return res.status(400).json({ error: "No user" });
  const valid = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: "Wrong password" });
  res.json({ id: result.rows[0].id, email });
});

// Chat send
app.post("/message", async (req, res) => {
  const { user_id, sender, content } = req.body;
  await pool.query(
    "INSERT INTO messages (user_id, sender, content) VALUES ($1,$2,$3)",
    [user_id, sender, content]
  );
  res.json({ success: true });
});

// Chat fetch
app.get("/messages/:user_id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM messages WHERE user_id=$1 ORDER BY created_at ASC",
    [req.params.user_id]
  );
  res.json(result.rows);
});

// Wallet add/update
app.post("/wallet", async (req, res) => {
  const { user_id, asset, balance } = req.body;
  await pool.query(
    "INSERT INTO wallets (user_id, asset, balance) VALUES ($1,$2,$3) ON CONFLICT (user_id, asset) DO UPDATE SET balance=$3",
    [user_id, asset, balance]
  );
  res.json({ success: true });
});

// Wallet fetch
app.get("/wallet/:user_id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM wallets WHERE user_id=$1",
    [req.params.user_id]
  );
  res.json(result.rows);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`YBT backend running on ${port}`));
  
