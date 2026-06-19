const pool   = require("../config/db");
const bcrypt = require("bcryptjs");

/* ── GET /api/admin/stats ─────────────────────────────────────────────────── */
const getStats = async (req, res) => {
  try {
    const [users, courses, clubs, messages, activeToday, newUsersWeek, totalMessages] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM users"),
        pool.query("SELECT COUNT(*) FROM courses"),
        pool.query("SELECT COUNT(*) FROM clubs"),
        pool.query("SELECT COUNT(*) FROM messages WHERE sent_at > NOW() - INTERVAL '24 hours'"),
        pool.query("SELECT COUNT(*) FROM users WHERE is_online = TRUE"),
        pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"),
        pool.query("SELECT COUNT(*) FROM messages"),
      ]);

    // Role breakdown
    const roles = await pool.query(
      "SELECT role, COUNT(*) AS cnt FROM users GROUP BY role ORDER BY cnt DESC"
    );

    res.json({
      total_users:      parseInt(users.rows[0].count),
      total_courses:    parseInt(courses.rows[0].count),
      total_clubs:      parseInt(clubs.rows[0].count),
      messages_today:   parseInt(messages.rows[0].count),
      active_users:     parseInt(activeToday.rows[0].count),
      new_users_week:   parseInt(newUsersWeek.rows[0].count),
      total_messages:   parseInt(totalMessages.rows[0].count),
      role_breakdown:   roles.rows.map(r => ({ role: r.role, count: parseInt(r.cnt) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── GET /api/admin/users ─────────────────────────────────────────────────── */
const getUsers = async (req, res) => {
  try {
    const { search = "", role = "", page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      where += ` AND u.role = $${params.length}`;
    }

    const countQ = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params);
    const total  = parseInt(countQ.rows[0].count);

    params.push(parseInt(limit), offset);
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.avatar_color, u.is_online, u.created_at,
              COALESCE(x.total_xp, 0) AS total_xp, COALESCE(x.level_name, 'Beginner') AS level_name,
              (SELECT COUNT(*) FROM course_members cm WHERE cm.user_id = u.id) AS course_count
       FROM users u
       LEFT JOIN user_xp x ON x.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ users: rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── PATCH /api/admin/users/:id/role ─────────────────────────────────────── */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ["student", "instructor", "club_member", "student_club", "admin"];
    if (!allowed.includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Cannot change your own role" });

    const { rows } = await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, role",
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── DELETE /api/admin/users/:id ─────────────────────────────────────────── */
const deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── GET /api/admin/courses ───────────────────────────────────────────────── */
const getAllCourses = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const params = search ? [`%${search}%`] : [];
    const where  = search ? "WHERE c.name ILIKE $1 OR c.code ILIKE $1" : "";

    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.code, c.color, c.created_at,
              u.full_name AS instructor_name,
              (SELECT COUNT(*) FROM course_members WHERE course_id = c.id AND role = 'student')   AS student_count,
              (SELECT COUNT(*) FROM course_members WHERE course_id = c.id AND role = 'instructor') AS instructor_count,
              (SELECT COUNT(*) FROM messages WHERE channel_type = 'course' AND channel_id = c.id) AS message_count
       FROM courses c
       LEFT JOIN course_members cm2 ON cm2.course_id = c.id AND cm2.role = 'instructor'
       LEFT JOIN users u ON u.id = cm2.user_id
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── DELETE /api/admin/courses/:id ───────────────────────────────────────── */
const deleteCourse = async (req, res) => {
  try {
    await pool.query("DELETE FROM courses WHERE id = $1", [req.params.id]);
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── GET /api/admin/messages ─────────────────────────────────────────────── */
const getMessages = async (req, res) => {
  try {
    const { search = "", channel_type = "", page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND m.content ILIKE $${params.length}`;
    }
    if (channel_type) {
      params.push(channel_type);
      where += ` AND m.channel_type = $${params.length}`;
    }

    const countQ = await pool.query(`SELECT COUNT(*) FROM messages m ${where}`, params);
    const total  = parseInt(countQ.rows[0].count);

    params.push(parseInt(limit), offset);
    const { rows } = await pool.query(
      `SELECT m.id, m.content, m.channel_type, m.channel_id, m.sent_at,
              u.id AS sender_id, u.full_name AS sender_name, u.email AS sender_email,
              CASE
                WHEN m.channel_type = 'course' THEN (SELECT name FROM courses  WHERE id = m.channel_id)
                WHEN m.channel_type = 'club'   THEN (SELECT name FROM clubs    WHERE id = m.channel_id)
                WHEN m.channel_type = 'team'   THEN (SELECT name FROM teams    WHERE id = m.channel_id)
                ELSE 'Direct'
              END AS channel_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       ${where}
       ORDER BY m.sent_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ messages: rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── DELETE /api/admin/messages/:id ─────────────────────────────────────── */
const deleteMessage = async (req, res) => {
  try {
    await pool.query("DELETE FROM messages WHERE id = $1", [req.params.id]);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

/* ── GET /api/admin/clubs ────────────────────────────────────────────────── */
const getAdminClubs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.color, c.created_at,
              (SELECT COUNT(*) FROM club_members WHERE club_id=c.id AND status='approved') AS member_count,
              (SELECT COUNT(*) FROM club_members WHERE club_id=c.id AND status='pending')  AS pending_count,
              (SELECT COUNT(*) FROM club_channels WHERE club_id=c.id) AS channel_count,
              (SELECT json_agg(json_build_object('id',u.id,'name',u.full_name,'email',u.email))
               FROM club_members cm JOIN users u ON u.id=cm.user_id
               WHERE cm.club_id=c.id AND cm.role IN ('manager','admin') AND cm.status='approved') AS managers
       FROM clubs c ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
};

/* ── POST /api/admin/clubs ───────────────────────────────────────────────── */
const createAdminClub = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const { rows } = await pool.query(
      "INSERT INTO clubs (name, description, color, created_by) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, description || null, color || "#7c3aed", req.user.id]
    );
    const clubId = rows[0].id;
    // Auto-create general channel
    await pool.query(
      "INSERT INTO club_channels (club_id, name, description, is_general, created_by) VALUES ($1,'general','General announcements',TRUE,$2)",
      [clubId, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
};

/* ── DELETE /api/admin/clubs/:id ─────────────────────────────────────────── */
const deleteAdminClub = async (req, res) => {
  try {
    await pool.query("DELETE FROM clubs WHERE id=$1", [req.params.id]);
    res.json({ message: "Club deleted" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── PATCH /api/admin/clubs/:id/assign-manager ───────────────────────────── */
const assignManager = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    // Upsert membership as manager+approved
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, role, status)
       VALUES ($1,$2,'manager','approved')
       ON CONFLICT (club_id, user_id) DO UPDATE SET role='manager', status='approved'`,
      [req.params.id, user_id]
    );
    res.json({ message: "Manager assigned" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── DELETE /api/admin/clubs/:id/managers/:uid ───────────────────────────── */
const removeManager = async (req, res) => {
  try {
    await pool.query(
      "UPDATE club_members SET role='member' WHERE club_id=$1 AND user_id=$2",
      [req.params.id, req.params.uid]
    );
    res.json({ message: "Manager removed" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── GET /api/admin/analytics ────────────────────────────────────────────── */
const getAnalytics = async (req, res) => {
  try {
    // User growth last 8 weeks
    const { rows: userGrowth } = await pool.query(`
      SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
      FROM users
      WHERE created_at > NOW() - INTERVAL '8 weeks'
      GROUP BY week ORDER BY week
    `);

    // Messages per day last 14 days
    const { rows: msgActivity } = await pool.query(`
      SELECT DATE(sent_at) AS day, COUNT(*) AS count
      FROM messages
      WHERE sent_at > NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day
    `);

    // XP distribution buckets
    const { rows: xpDist } = await pool.query(`
      SELECT
        COUNT(CASE WHEN total_xp=0 THEN 1 END) AS zero,
        COUNT(CASE WHEN total_xp BETWEEN 1 AND 100 THEN 1 END) AS beginner,
        COUNT(CASE WHEN total_xp BETWEEN 101 AND 500 THEN 1 END) AS intermediate,
        COUNT(CASE WHEN total_xp BETWEEN 501 AND 1000 THEN 1 END) AS advanced,
        COUNT(CASE WHEN total_xp > 1000 THEN 1 END) AS expert
      FROM user_xp
    `);

    // Top 5 most active courses
    const { rows: topCourses } = await pool.query(`
      SELECT c.name, c.code, c.color,
             COUNT(m.id) AS message_count
      FROM courses c
      LEFT JOIN messages m ON m.channel_type='course' AND m.channel_id=c.id
      GROUP BY c.id ORDER BY message_count DESC LIMIT 5
    `);

    // Top 5 active clubs
    const { rows: topClubs } = await pool.query(`
      SELECT cl.name, cl.color,
             (SELECT COUNT(*) FROM club_members WHERE club_id=cl.id AND status='approved') AS member_count
      FROM clubs cl ORDER BY member_count DESC LIMIT 5
    `);

    res.json({ userGrowth, msgActivity, xpDist: xpDist[0], topCourses, topClubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── POST /api/admin/courses/:id/bulk-enroll ─────────────────────────────── */
const bulkEnroll = async (req, res) => {
  try {
    const { course_id } = req.params;
    const { emails } = req.body; // array of email strings
    if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: "emails array required" });

    const results = { enrolled: [], not_found: [], already_in: [] };
    for (const email of emails) {
      const { rows } = await pool.query("SELECT id FROM users WHERE email=LOWER($1)", [email.trim()]);
      if (!rows.length) { results.not_found.push(email); continue; }
      const userId = rows[0].id;
      try {
        await pool.query(
          "INSERT INTO course_members (course_id, user_id, role) VALUES ($1,$2,'student')",
          [course_id, userId]
        );
        results.enrolled.push(email);
      } catch {
        results.already_in.push(email);
      }
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── POST /api/admin/system-announcement ──────────────────────────────────── */
const systemAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "title + content required" });

    const { rows } = await pool.query(
      "INSERT INTO announcements (title, content, created_by, scope) VALUES ($1,$2,$3,'system') RETURNING *",
      [title, content, req.user.id]
    );

    // Notify all users
    const { rows: users } = await pool.query("SELECT id FROM users WHERE id != $1", [req.user.id]);
    const notifValues = users.map((u, i) => `($${i*3+1},$${i*3+2},$${i*3+3},'announcement')`).join(",");
    if (users.length) {
      const notifParams = users.flatMap(u => [u.id, `📣 ${title}`, "/announcements"]);
      await pool.query(
        `INSERT INTO notifications (user_id, message, link, type) VALUES ${notifValues}`,
        notifParams
      );
    }

    // Push to all
    const { sendPushToMany } = require("../services/pushService");
    sendPushToMany(users.map(u => u.id), { title: `📣 ${title}`, body: content.slice(0, 80), url: "/" });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ── GET /api/admin/notifications ─────────────────────────────────────────── */
const markAllRead = async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read=TRUE WHERE user_id=$1", [req.user.id]);
    res.json({ message: "All read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getStats, getUsers, updateUserRole, deleteUser,
  getAllCourses, deleteCourse,
  getMessages, deleteMessage,
  getAdminClubs, createAdminClub, deleteAdminClub, assignManager, removeManager,
  getAnalytics, bulkEnroll, systemAnnouncement, markAllRead,
};
