const pool = require("../config/db");

// GET /api/courses  — courses for the logged-in user
const getMyCourses = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.code, c.color,
              cm.role AS member_role,
              (SELECT COUNT(*) FROM course_members WHERE course_id = c.id) AS student_count,
              (SELECT COUNT(*) FROM messages WHERE channel_type = 'course' AND channel_id = c.id) AS message_count
       FROM courses c
       JOIN course_members cm ON cm.course_id = c.id
       WHERE cm.user_id = $1
       ORDER BY c.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/courses/:id
const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*,
              u.full_name AS instructor_name,
              (SELECT COUNT(*) FROM course_members WHERE course_id = c.id AND role = 'student') AS student_count
       FROM courses c
       LEFT JOIN course_members cm2 ON cm2.course_id = c.id AND cm2.role = 'instructor'
       LEFT JOIN users u ON u.id = cm2.user_id
       WHERE c.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Course not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/courses  — instructor/admin only
const createCourse = async (req, res) => {
  try {
    const { name, code, color } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO courses (name, code, color, created_by) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, code, color || "#3b82f6", req.user.id]
    );
    // Enroll creator as instructor
    await pool.query(
      "INSERT INTO course_members (course_id, user_id, role) VALUES ($1,$2,'instructor')",
      [rows[0].id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Course code already exists" });
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/courses/:id/join
const joinCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "INSERT INTO course_members (course_id, user_id, role) VALUES ($1,$2,'student') ON CONFLICT DO NOTHING",
      [id, req.user.id]
    );
    res.json({ message: "Joined course" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/courses/:id/members
const getCourseMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.avatar_color, u.is_online, cm.role
       FROM users u
       JOIN course_members cm ON cm.user_id = u.id
       WHERE cm.course_id = $1
       ORDER BY cm.role DESC, u.full_name`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getMyCourses, getCourse, createCourse, joinCourse, getCourseMembers };
