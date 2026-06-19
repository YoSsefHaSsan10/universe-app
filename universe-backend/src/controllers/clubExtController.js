const pool = require("../config/db");
const path = require("path");
const fs   = require("fs");

/* ═══════════════════════════════════════════════════════════════
   CLUB ANNOUNCEMENTS
═══════════════════════════════════════════════════════════════ */
const getClubAnnouncements = async (req, res) => {
  try {
    const { id } = req.params; // club id
    const { rows } = await pool.query(`
      SELECT a.*, u.full_name AS author_name, u.avatar_color,
             c.name AS course_name
      FROM announcements a
      JOIN users u ON u.id = a.created_by
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE a.club_id = $1
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createClubAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "title + content required" });

    // Check user is manager/admin of this club or system admin
    if (req.user.role !== "admin") {
      const { rows } = await pool.query(
        "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
        [id, req.user.id]
      );
      if (!rows.length || !["manager","admin"].includes(rows[0].role))
        return res.status(403).json({ error: "Only club managers can post announcements" });
    }

    const { rows } = await pool.query(
      "INSERT INTO announcements (title, content, created_by, club_id, scope) VALUES ($1,$2,$3,$4,'club') RETURNING *",
      [title, content, req.user.id, id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteClubAnnouncement = async (req, res) => {
  try {
    const { id, aid } = req.params;
    await pool.query("DELETE FROM announcements WHERE id=$1 AND club_id=$2", [aid, id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CLUB EVENTS
═══════════════════════════════════════════════════════════════ */
const getClubEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT e.*, u.full_name AS created_by_name
      FROM events e
      JOIN users u ON u.id = e.created_by
      WHERE e.club_id = $1
      ORDER BY e.start_time ASC
    `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createClubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, start_time, end_time } = req.body;
    if (!title || !start_time) return res.status(400).json({ error: "title + start_time required" });

    if (req.user.role !== "admin") {
      const { rows } = await pool.query(
        "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
        [id, req.user.id]
      );
      if (!rows.length || !["manager","admin"].includes(rows[0].role))
        return res.status(403).json({ error: "Only club managers can create events" });
    }

    const { rows } = await pool.query(
      "INSERT INTO events (title, description, type, start_time, end_time, club_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [title, description || null, type || "event", start_time, end_time || null, id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   CLUB GALLERY
═══════════════════════════════════════════════════════════════ */
const getGallery = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.*, u.full_name AS uploader_name
      FROM club_gallery g JOIN users u ON u.id = g.uploader_id
      WHERE g.club_id = $1
      ORDER BY g.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const uploadGallery = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });
    const { caption } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO club_gallery (club_id, uploader_id, file_path, caption) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.params.id, req.user.id, `/uploads/${req.file.filename}`, caption || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteGalleryItem = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM club_gallery WHERE id=$1", [req.params.gid]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    if (rows[0].uploader_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });

    // Delete file
    const fp = path.join(__dirname, "../../", rows[0].file_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await pool.query("DELETE FROM club_gallery WHERE id=$1", [req.params.gid]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getClubAnnouncements, createClubAnnouncement, deleteClubAnnouncement,
  getClubEvents, createClubEvent,
  getGallery, uploadGallery, deleteGalleryItem,
};
