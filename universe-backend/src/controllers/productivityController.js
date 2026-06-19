const pool = require("../config/db");

/* ═══════════════════════════════════════════════════════════════
   STUDY STREAKS
═══════════════════════════════════════════════════════════════ */
const getStreak = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM study_streaks WHERE user_id=$1", [req.user.id]
    );
    res.json(rows[0] || { user_id: req.user.id, current_streak: 0, longest_streak: 0, last_activity_date: null });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Called on login from authController (also exposed as endpoint)
const recordActivity = async (userId) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      "SELECT * FROM study_streaks WHERE user_id=$1", [userId]
    );
    if (!rows.length) {
      await pool.query(
        "INSERT INTO study_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES ($1,1,1,$2)",
        [userId, today]
      );
    } else {
      const streak = rows[0];
      const last = streak.last_activity_date ? streak.last_activity_date.toISOString?.().slice(0,10) || streak.last_activity_date : null;
      if (last === today) return; // Already recorded today
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yest = yesterday.toISOString().slice(0, 10);
      const newStreak = last === yest ? streak.current_streak + 1 : 1;
      const longest = Math.max(newStreak, streak.longest_streak);
      await pool.query(
        "UPDATE study_streaks SET current_streak=$1, longest_streak=$2, last_activity_date=$3 WHERE user_id=$4",
        [newStreak, longest, today, userId]
      );
    }
  } catch (err) {
    console.error("Streak update error:", err.message);
  }
};

const touchStreak = async (req, res) => {
  await recordActivity(req.user.id);
  const { rows } = await pool.query("SELECT * FROM study_streaks WHERE user_id=$1", [req.user.id]);
  res.json(rows[0] || { current_streak: 1 });
};

/* ═══════════════════════════════════════════════════════════════
   GOALS
═══════════════════════════════════════════════════════════════ */
const getGoals = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM goals WHERE user_id=$1 ORDER BY completed ASC, target_date ASC NULLS LAST",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createGoal = async (req, res) => {
  try {
    const { title, description, target_date, xp_reward = 50 } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });
    const { rows } = await pool.query(
      "INSERT INTO goals (user_id, title, description, target_date, xp_reward) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [req.user.id, title, description || null, target_date || null, xp_reward]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const completeGoal = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE goals SET completed=TRUE, completed_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    // Award XP
    const xp = rows[0].xp_reward;
    await pool.query(
      "UPDATE user_xp SET total_xp = total_xp + $1 WHERE user_id=$2",
      [xp, req.user.id]
    );
    // In-app notification
    await pool.query(
      "INSERT INTO notifications (user_id, message, type) VALUES ($1,$2,'success')",
      [req.user.id, `🎯 Goal completed! You earned ${xp} XP — "${rows[0].title}"`]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteGoal = async (req, res) => {
  try {
    await pool.query("DELETE FROM goals WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getStreak, touchStreak, recordActivity, getGoals, createGoal, completeGoal, deleteGoal };
