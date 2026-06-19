const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, role, avatar_color, created_at`,
      [full_name, email, hash]
    );
    const user = rows[0];

    // Create default settings & xp rows
    await pool.query("INSERT INTO user_settings (user_id) VALUES ($1)", [user.id]);
    await pool.query("INSERT INTO user_xp (user_id) VALUES ($1)", [user.id]);

    // Assign all badges as locked (progress = 0)
    const badges = await pool.query("SELECT id FROM badges");
    for (const badge of badges.rows) {
      await pool.query(
        "INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)",
        [user.id, badge.id]
      );
    }

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      "SELECT id, full_name, email, role, avatar_color, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Set online
    await pool.query("UPDATE users SET is_online = TRUE WHERE id = $1", [user.id]);

    // Update study streak
    const { recordActivity } = require("./productivityController");
    recordActivity(user.id).catch(() => {});

    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await pool.query("UPDATE users SET is_online = FALSE WHERE id = $1", [req.user.id]);
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.avatar_color, u.is_online, u.created_at,
              x.total_xp, x.level_name,
              s.theme, s.notif_announcements, s.notif_reminders, s.notif_events,
              s.profile_visibility, s.two_factor_enabled
       FROM users u
       LEFT JOIN user_xp x ON x.user_id = u.id
       LEFT JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, logout, getMe };
