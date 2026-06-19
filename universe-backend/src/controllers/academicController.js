const pool   = require("../config/db");
const path   = require("path");
const fs     = require("fs");
const multer = require("multer");

/* ═══════════════════════════════════════════════════════════════
   GRADES
═══════════════════════════════════════════════════════════════ */
const getGrades = async (req, res) => {
  try {
    const { course_id } = req.query;
    const params = [req.user.id];
    let where = "WHERE g.user_id=$1";
    if (course_id) { params.push(course_id); where += ` AND g.course_id=$${params.length}`; }

    const { rows } = await pool.query(`
      SELECT g.*, c.name AS course_name, c.code AS course_code, c.color AS course_color
      FROM grades g JOIN courses c ON c.id = g.course_id
      ${where}
      ORDER BY g.created_at DESC
    `, params);

    // Calculate GPA per course
    const byC = {};
    for (const r of rows) {
      if (!byC[r.course_id]) byC[r.course_id] = { name: r.course_name, code: r.course_code, color: r.course_color, items: [] };
      byC[r.course_id].items.push(r);
    }
    const summary = Object.values(byC).map(c => {
      const total = c.items.reduce((s, i) => s + parseFloat(i.weight), 0);
      const weighted = c.items.reduce((s, i) => s + (parseFloat(i.score) / parseFloat(i.max_score)) * parseFloat(i.weight), 0);
      const pct = total > 0 ? (weighted / total * 100).toFixed(1) : null;
      return { ...c, percentage: pct };
    });
    res.json({ grades: rows, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const addGrade = async (req, res) => {
  try {
    const { course_id, item_name, item_type, score, max_score, weight } = req.body;
    if (!course_id || !item_name || score == null) return res.status(400).json({ error: "course_id, item_name, score required" });
    const { rows } = await pool.query(
      "INSERT INTO grades (user_id, course_id, item_name, item_type, score, max_score, weight) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [req.user.id, course_id, item_name, item_type || "assignment", score, max_score || 100, weight || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteGrade = async (req, res) => {
  try {
    await pool.query("DELETE FROM grades WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ASSESSMENTS (Instructor creates; students see & submit)
═══════════════════════════════════════════════════════════════ */
const getAssessments = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { rows } = await pool.query(`
      SELECT a.*,
             (SELECT COUNT(*) FROM assignment_submissions WHERE assessment_id=a.id) AS submission_count,
             (SELECT file_path FROM assignment_submissions WHERE assessment_id=a.id AND student_id=$2) AS my_submission,
             (SELECT grade FROM assignment_submissions WHERE assessment_id=a.id AND student_id=$2) AS my_grade,
             (SELECT feedback FROM assignment_submissions WHERE assessment_id=a.id AND student_id=$2) AS my_feedback
      FROM course_assessments a
      WHERE a.course_id=$1
      ORDER BY a.due_date ASC NULLS LAST
    `, [course_id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createAssessment = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { title, type, description, due_date, max_score, weight } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });
    const { rows } = await pool.query(
      "INSERT INTO course_assessments (course_id, title, type, description, due_date, max_score, weight, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [course_id, title, type || "assignment", description || null, due_date || null, max_score || 100, weight || 1, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteAssessment = async (req, res) => {
  try {
    await pool.query("DELETE FROM course_assessments WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── Submissions ── */
const submitAssignment = async (req, res) => {
  try {
    const { assessment_id } = req.params;
    const { note } = req.body;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    const { rows } = await pool.query(`
      INSERT INTO assignment_submissions (assessment_id, student_id, file_path, note)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (assessment_id, student_id)
      DO UPDATE SET file_path=COALESCE($3,assignment_submissions.file_path), note=$4, submitted_at=NOW()
      RETURNING *
    `, [assessment_id, req.user.id, filePath, note || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const { assessment_id } = req.params;
    const { rows } = await pool.query(`
      SELECT s.*, u.full_name, u.email
      FROM assignment_submissions s
      JOIN users u ON u.id = s.student_id
      WHERE s.assessment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assessment_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const { rows } = await pool.query(`
      UPDATE assignment_submissions
      SET grade=$1, feedback=$2, graded_at=NOW()
      WHERE id=$3
      RETURNING *
    `, [grade, feedback || null, req.params.sub_id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ATTENDANCE
═══════════════════════════════════════════════════════════════ */
const getAttendanceSessions = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { rows } = await pool.query(`
      SELECT s.*,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id=s.id AND status='present') AS present_count,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id=s.id) AS total_marked,
             (SELECT status FROM attendance_records WHERE session_id=s.id AND student_id=$2) AS my_status
      FROM attendance_sessions s
      WHERE s.course_id=$1
      ORDER BY s.session_date DESC
    `, [course_id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createAttendanceSession = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { session_date, topic } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO attendance_sessions (course_id, session_date, topic, created_by) VALUES ($1,$2,$3,$4) RETURNING *",
      [course_id, session_date || new Date().toISOString().slice(0,10), topic || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { records } = req.body; // [{ student_id, status }]
    if (!Array.isArray(records)) return res.status(400).json({ error: "records array required" });

    for (const r of records) {
      await pool.query(`
        INSERT INTO attendance_records (session_id, student_id, status)
        VALUES ($1,$2,$3)
        ON CONFLICT (session_id, student_id) DO UPDATE SET status=$3
      `, [session_id, r.student_id, r.status || "absent"]);
    }
    res.json({ message: "Attendance saved" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total_sessions,
        COUNT(CASE WHEN ar.status='present' THEN 1 END) AS present,
        COUNT(CASE WHEN ar.status='late'    THEN 1 END) AS late,
        COUNT(CASE WHEN ar.status='absent' OR ar.student_id IS NULL THEN 1 END) AS absent
      FROM attendance_sessions s
      LEFT JOIN attendance_records ar ON ar.session_id=s.id AND ar.student_id=$2
      WHERE s.course_id=$1
    `, [course_id, req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getGrades, addGrade, deleteGrade,
  getAssessments, createAssessment, deleteAssessment,
  submitAssignment, getSubmissions, gradeSubmission,
  getAttendanceSessions, createAttendanceSession, markAttendance, getMyAttendance,
};
