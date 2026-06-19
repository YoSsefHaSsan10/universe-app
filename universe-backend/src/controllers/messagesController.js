const pool = require("../config/db");

// GET /api/messages?channel_type=course&channel_id=1&limit=50&before=<msg_id>
const getMessages = async (req, res) => {
  try {
    const { channel_type, channel_id, limit = 50, before } = req.query;
    if (!channel_type || !channel_id)
      return res.status(400).json({ error: "channel_type and channel_id required" });

    let query = `
      SELECT m.id, m.content, m.sent_at,
             u.id AS sender_id, u.full_name AS sender_name, u.avatar_color
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.channel_type = $1 AND m.channel_id = $2
    `;
    const params = [channel_type, channel_id];

    if (before) {
      query += ` AND m.id < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY m.sent_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);
    res.json(rows.reverse());   // oldest first
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { channel_type, channel_id, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    const { rows } = await pool.query(
      `INSERT INTO messages (channel_type, channel_id, sender_id, content)
       VALUES ($1,$2,$3,$4)
       RETURNING id, content, sent_at`,
      [channel_type, channel_id, req.user.id, content.trim()]
    );

    res.status(201).json({
      ...rows[0],
      sender_id:   req.user.id,
      sender_name: req.user.full_name,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/messages/:id  — own messages only
const deleteMessage = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(403).json({ error: "Not allowed" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getMessages, sendMessage, deleteMessage };
