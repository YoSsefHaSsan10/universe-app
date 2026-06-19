const pool = require("../config/db");

// GET /api/events?from=...&to=...&type=...&course_id=...
const getEvents = async (req, res) => {
  try {
    const { from, to, type, course_id } = req.query;

    let query = `
      SELECT e.id, e.title, e.description, e.type, e.start_time, e.end_time,
             c.name AS course_name, c.code AS course_code,
             cl.name AS club_name,
             u.full_name AS created_by_name
      FROM events e
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN clubs cl ON cl.id = e.club_id
      LEFT JOIN users u ON u.id = e.created_by
    `;
    const params = [];

    if (course_id) {
      // Specific course — no membership check needed (header button shows for enrolled users)
      params.push(course_id);
      query += ` WHERE e.course_id = $${params.length}`;
      if (type) { params.push(type); query += ` AND e.type = $${params.length}`; }
    } else {
      // General calendar — filter to the user's courses / clubs / global events
      const courseIds = await pool.query(
        "SELECT course_id FROM course_members WHERE user_id = $1", [req.user.id]
      );
      const clubIds = await pool.query(
        "SELECT club_id FROM club_members WHERE user_id = $1", [req.user.id]
      );
      const cIds  = courseIds.rows.map(r => r.course_id);
      const clIds = clubIds.rows.map(r => r.club_id);
      params.push(cIds.length ? cIds : [0], clIds.length ? clIds : [0]);
      query += ` WHERE (e.course_id = ANY($1) OR e.club_id = ANY($2) OR (e.course_id IS NULL AND e.club_id IS NULL))`;
      if (from) { params.push(from); query += ` AND e.start_time >= $${params.length}`; }
      if (to)   { params.push(to);   query += ` AND e.start_time <= $${params.length}`; }
      if (type) { params.push(type); query += ` AND e.type = $${params.length}`; }
    }

    query += " ORDER BY e.start_time ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/events
const createEvent = async (req, res) => {
  try {
    const { title, description, type, start_time, end_time, course_id, club_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, type, start_time, end_time, course_id, club_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, type || "lecture", start_time, end_time || null,
       course_id || null, club_id || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM events WHERE id = $1 AND created_by = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getEvents, createEvent, deleteEvent };
