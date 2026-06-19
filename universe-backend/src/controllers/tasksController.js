const pool = require("../config/db");

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.due_date, t.is_done, t.created_at,
              c.name AS course_name, c.code AS course_code, c.color AS course_color
       FROM tasks t
       LEFT JOIN courses c ON c.id = t.course_id
       WHERE t.user_id = $1
       ORDER BY t.is_done ASC, t.due_date ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, due_date, course_id } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO tasks (user_id, title, due_date, course_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.user.id, title, due_date || null, course_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/tasks/:id/toggle
const toggleTask = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET is_done = NOT is_done WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Task not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getTasks, createTask, toggleTask, deleteTask };
