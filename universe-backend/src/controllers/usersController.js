const pool   = require("../config/db");
const bcrypt = require("bcryptjs");

// GET /api/users/activity  — recent activity feed for current user
const getActivity = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.action, a.context, a.context_id, a.created_at,
              u.full_name AS actor_name, u.avatar_color AS actor_color
       FROM activity_log a
       JOIN users u ON u.id = a.actor_id
       WHERE a.target_id = $1
       ORDER BY a.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/users/notifications
const getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/users/notifications/:id/read
const markNotifRead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, avatar_color } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name),
                        avatar_color = COALESCE($2, avatar_color),
                        updated_at = NOW()
       WHERE id = $3 RETURNING id, full_name, email, role, avatar_color`,
      [full_name, avatar_color, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/users/password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const { rows } = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1", [req.user.id]
    );
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/users/settings
const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/users/settings
const updateSettings = async (req, res) => {
  try {
    const { theme, notif_announcements, notif_reminders, notif_events,
            profile_visibility, two_factor_enabled } = req.body;

    const { rows } = await pool.query(
      `UPDATE user_settings SET
         theme                 = COALESCE($1, theme),
         notif_announcements   = COALESCE($2, notif_announcements),
         notif_reminders       = COALESCE($3, notif_reminders),
         notif_events          = COALESCE($4, notif_events),
         profile_visibility    = COALESCE($5, profile_visibility),
         two_factor_enabled    = COALESCE($6, two_factor_enabled),
         updated_at            = NOW()
       WHERE user_id = $7 RETURNING *`,
      [theme, notif_announcements, notif_reminders, notif_events,
       profile_visibility, two_factor_enabled, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/users/home-summary  — stats for home dashboard
const getHomeSummary = async (req, res) => {
  try {
    const uid = req.user.id;
    const [courses, tasks, events, messages] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM course_members WHERE user_id = $1", [uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND is_done = FALSE", [uid]),
      pool.query(`SELECT COUNT(*) FROM events e
                  WHERE e.start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
                  AND (e.course_id IN (SELECT course_id FROM course_members WHERE user_id = $1)
                    OR e.club_id   IN (SELECT club_id   FROM club_members   WHERE user_id = $1))`, [uid]),
      pool.query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, [uid]),
    ]);

    res.json({
      active_courses:    parseInt(courses.rows[0].count),
      pending_tasks:     parseInt(tasks.rows[0].count),
      events_this_week:  parseInt(events.rows[0].count),
      unread_messages:   parseInt(messages.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getActivity, getNotifications, markNotifRead,
  updateProfile, changePassword, getSettings, updateSettings, getHomeSummary,
};
