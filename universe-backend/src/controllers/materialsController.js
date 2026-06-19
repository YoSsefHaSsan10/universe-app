const pool = require("../config/db");
const path = require("path");
const fs   = require("fs");

/* GET /api/courses/:id/materials */
const getMaterials = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.title, m.type, m.url, m.description, m.created_at,
              u.full_name AS uploaded_by
       FROM course_materials m
       LEFT JOIN users u ON u.id = m.created_by
       WHERE m.course_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* POST /api/courses/:id/materials  (link or uploaded file) */
const addMaterial = async (req, res) => {
  try {
    const { title, type, url, description } = req.body;
    let finalUrl = url;

    // If a file was uploaded via multer, use its path
    if (req.file) {
      finalUrl = `/uploads/${req.file.filename}`;
    }

    if (!title || !finalUrl) {
      return res.status(400).json({ error: "Title and URL are required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO course_materials (course_id, title, type, url, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, title, type || "link", finalUrl, description || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* DELETE /api/courses/:id/materials/:mid */
const deleteMaterial = async (req, res) => {
  try {
    // Get material to check ownership and file path
    const { rows } = await pool.query(
      "SELECT * FROM course_materials WHERE id = $1 AND course_id = $2",
      [req.params.mid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const mat = rows[0];
    // Only the uploader or admin can delete
    if (mat.created_by !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete local file if it was uploaded
    if (mat.url.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, "../../uploads", path.basename(mat.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query("DELETE FROM course_materials WHERE id = $1", [req.params.mid]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getMaterials, addMaterial, deleteMaterial };
