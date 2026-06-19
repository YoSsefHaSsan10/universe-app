const pool = require("../config/db");

// GET /api/push/vapid-public-key
const getVapidKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /api/push/subscribe
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ error: "Invalid subscription object" });

    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=$3, auth=$4
    `, [req.user.id, endpoint, keys.p256dh, keys.auth]);

    res.json({ message: "Subscribed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/push/unsubscribe
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pool.query(
      "DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2",
      [req.user.id, endpoint]
    );
    res.json({ message: "Unsubscribed" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/push/status — does this user have push enabled?
const getStatus = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM push_subscriptions WHERE user_id=$1",
      [req.user.id]
    );
    res.json({ subscribed: parseInt(rows[0].count) > 0 });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getVapidKey, subscribe, unsubscribe, getStatus };
