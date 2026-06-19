const pool = require("../config/db");

// GET /api/announcements?course_id=&pinned=true
const getAnnouncements = async (req, res) => {
  try {
    const { course_id, pinned } = req.query;
    let query = `
      SELECT a.id, a.title, a.body, a.tag, a.is_pinned, a.created_at,
             u.full_name AS created_by_name,
             c.name AS course_name, c.code AS course_code
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) { query += ` AND a.course_id = $${params.length + 1}`; params.push(course_id); }
    else           { query += ` AND a.course_id IS NULL`; }   // university-wide

    if (pinned === "true") { query += ` AND a.is_pinned = TRUE`; }

    query += " ORDER BY a.is_pinned DESC, a.created_at DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/announcements  — instructor/admin only
const createAnnouncement = async (req, res) => {
  try {
    const { title, body, tag, is_pinned, course_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO announcements (title, body, tag, is_pinned, course_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, body, tag || "General", is_pinned || false, course_id || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/announcements/:id/pin
const togglePin = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE announcements SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/announcements/:id
// Admins can always delete. Instructors only within 10 minutes of posting.
const deleteAnnouncement = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT created_at, created_by FROM announcements WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin) {
      const ageMs = Date.now() - new Date(rows[0].created_at).getTime();
      if (ageMs > 10 * 60 * 1000) {
        return res.status(403).json({ error: "Cannot delete announcements after 10 minutes" });
      }
      if (rows[0].created_by !== req.user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    await pool.query("DELETE FROM announcements WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAnnouncements, createAnnouncement, togglePin, deleteAnnouncement };
