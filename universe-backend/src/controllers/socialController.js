const pool = require("../config/db");

/* ═══════════════════════════════════════════════════════════════
   LEADERBOARD
═══════════════════════════════════════════════════════════════ */
const getLeaderboard = async (req, res) => {
  try {
    const { scope = "global", course_id } = req.query;
    let query, params = [];

    if (scope === "course" && course_id) {
      query = `
        SELECT u.id, u.full_name, u.avatar_color, u.role,
               COALESCE(x.total_xp,0) AS total_xp,
               COALESCE(x.level_name,'Beginner') AS level_name,
               ROW_NUMBER() OVER (ORDER BY COALESCE(x.total_xp,0) DESC) AS rank
        FROM course_members cm
        JOIN users u ON u.id = cm.user_id
        LEFT JOIN user_xp x ON x.user_id = u.id
        WHERE cm.course_id = $1 AND cm.role = 'student'
        ORDER BY total_xp DESC LIMIT 50
      `;
      params = [course_id];
    } else {
      query = `
        SELECT u.id, u.full_name, u.avatar_color, u.role,
               COALESCE(x.total_xp,0) AS total_xp,
               COALESCE(x.level_name,'Beginner') AS level_name,
               ROW_NUMBER() OVER (ORDER BY COALESCE(x.total_xp,0) DESC) AS rank
        FROM users u
        LEFT JOIN user_xp x ON x.user_id = u.id
        WHERE u.role != 'admin'
        ORDER BY total_xp DESC LIMIT 50
      `;
    }
    const { rows } = await pool.query(query, params);

    // Mark current user's position
    const myRow = rows.find(r => r.id === req.user.id);
    res.json({ leaderboard: rows, my_rank: myRow ? parseInt(myRow.rank) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   USER PROFILE (public)
═══════════════════════════════════════════════════════════════ */
const getUserProfile = async (req, res) => {
  try {
    const targetId = req.params.id;
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.avatar_color, u.created_at,
             COALESCE(x.total_xp,0) AS total_xp,
             COALESCE(x.level_name,'Beginner') AS level_name,
             (SELECT COUNT(*) FROM course_members WHERE user_id=u.id) AS course_count,
             (SELECT COUNT(*) FROM club_members WHERE user_id=u.id AND status='approved') AS club_count,
             (SELECT COUNT(*) FROM user_badges WHERE user_id=u.id) AS badge_count,
             (SELECT COUNT(*) FROM tasks WHERE user_id=u.id AND completed=TRUE) AS tasks_done
      FROM users u
      LEFT JOIN user_xp x ON x.user_id = u.id
      WHERE u.id = $1
    `, [targetId]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    // Badges earned
    const { rows: badges } = await pool.query(`
      SELECT b.id, b.name, b.icon, b.color, b.description, ub.earned_at
      FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC LIMIT 6
    `, [targetId]);

    // Recent courses
    const { rows: courses } = await pool.query(`
      SELECT c.id, c.name, c.code, c.color, cm.role
      FROM course_members cm JOIN courses c ON c.id = cm.course_id
      WHERE cm.user_id = $1 LIMIT 5
    `, [targetId]);

    // Clubs
    const { rows: clubs } = await pool.query(`
      SELECT cl.id, cl.name, cl.color, cm.role
      FROM club_members cm JOIN clubs cl ON cl.id = cm.club_id
      WHERE cm.user_id = $1 AND cm.status = 'approved' LIMIT 5
    `, [targetId]);

    // Streak
    const { rows: streak } = await pool.query(
      "SELECT * FROM study_streaks WHERE user_id=$1", [targetId]
    );

    res.json({ ...rows[0], badges, courses, clubs, streak: streak[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   DIRECT MESSAGES
═══════════════════════════════════════════════════════════════ */
const getConversations = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cv.id,
             CASE WHEN cv.user1_id=$1 THEN cv.user2_id ELSE cv.user1_id END AS other_id,
             u.full_name AS other_name, u.avatar_color AS other_color, u.is_online AS other_online,
             (SELECT content FROM messages
              WHERE channel_type='dm' AND channel_id=cv.id
              ORDER BY sent_at DESC LIMIT 1) AS last_message,
             (SELECT sent_at FROM messages
              WHERE channel_type='dm' AND channel_id=cv.id
              ORDER BY sent_at DESC LIMIT 1) AS last_at,
             (SELECT COUNT(*) FROM messages
              WHERE channel_type='dm' AND channel_id=cv.id
                AND sender_id != $1 AND is_read=FALSE) AS unread
      FROM conversations cv
      JOIN users u ON u.id = CASE WHEN cv.user1_id=$1 THEN cv.user2_id ELSE cv.user1_id END
      WHERE cv.user1_id=$1 OR cv.user2_id=$1
      ORDER BY last_at DESC NULLS LAST
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOrCreateConversation = async (req, res) => {
  try {
    const { other_id } = req.body;
    if (!other_id) return res.status(400).json({ error: "other_id required" });
    const me = req.user.id;
    const u1 = Math.min(me, other_id), u2 = Math.max(me, other_id);

    let { rows } = await pool.query(
      "SELECT * FROM conversations WHERE user1_id=$1 AND user2_id=$2",
      [u1, u2]
    );
    if (!rows.length) {
      const r = await pool.query(
        "INSERT INTO conversations (user1_id, user2_id) VALUES ($1,$2) RETURNING *",
        [u1, u2]
      );
      rows = r.rows;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getDmMessages = async (req, res) => {
  try {
    const { id } = req.params;
    // Verify user is part of this conversation
    const { rows: cv } = await pool.query(
      "SELECT * FROM conversations WHERE id=$1 AND (user1_id=$2 OR user2_id=$2)",
      [id, req.user.id]
    );
    if (!cv.length) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await pool.query(`
      SELECT m.id, m.content, m.sent_at, m.is_read,
             u.id AS sender_id, u.full_name AS sender_name, u.avatar_color
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.channel_type='dm' AND m.channel_id=$1
      ORDER BY m.sent_at ASC
    `, [id]);

    // Mark as read
    await pool.query(
      "UPDATE messages SET is_read=TRUE WHERE channel_type='dm' AND channel_id=$1 AND sender_id!=$2",
      [id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const sendDm = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Message required" });

    const { rows: cv } = await pool.query(
      "SELECT * FROM conversations WHERE id=$1 AND (user1_id=$2 OR user2_id=$2)",
      [id, req.user.id]
    );
    if (!cv.length) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await pool.query(`
      INSERT INTO messages (content, channel_type, channel_id, sender_id)
      VALUES ($1,'dm',$2,$3)
      RETURNING id, content, sent_at
    `, [content.trim(), id, req.user.id]);

    // Push notification to the other person
    const otherId = cv[0].user1_id === req.user.id ? cv[0].user2_id : cv[0].user1_id;
    const { sendPushToUser } = require("../services/pushService");
    sendPushToUser(otherId, {
      title: `💬 New message from ${req.user.full_name}`,
      body: content.trim().slice(0, 80),
      url: "/",
    });

    // In-app notification
    await pool.query(
      "INSERT INTO notifications (user_id, message, type, link) VALUES ($1,$2,'message','/')",
      [otherId, `💬 ${req.user.full_name}: ${content.trim().slice(0, 60)}`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POLLS
═══════════════════════════════════════════════════════════════ */
const getPolls = async (req, res) => {
  try {
    const { channel_type, channel_id } = req.query;
    const { rows } = await pool.query(`
      SELECT p.*, u.full_name AS creator_name,
        (SELECT json_agg(json_build_object(
          'id', po.id, 'text', po.text, 'position', po.position,
          'votes', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id=po.id)
        ) ORDER BY po.position)
         FROM poll_options po WHERE po.poll_id=p.id) AS options,
        (SELECT option_id FROM poll_votes WHERE poll_id=p.id AND user_id=$1) AS my_vote
      FROM polls p
      JOIN users u ON u.id = p.created_by
      WHERE p.channel_type=$2 AND p.channel_id=$3
      ORDER BY p.created_at DESC
    `, [req.user.id, channel_type, channel_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const createPoll = async (req, res) => {
  try {
    const { question, options, channel_type, channel_id, ends_at } = req.body;
    if (!question?.trim() || !options?.length) return res.status(400).json({ error: "question + options required" });

    const { rows } = await pool.query(
      "INSERT INTO polls (question, channel_type, channel_id, created_by, ends_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [question, channel_type, channel_id, req.user.id, ends_at || null]
    );
    const pollId = rows[0].id;
    for (let i = 0; i < options.length; i++) {
      await pool.query(
        "INSERT INTO poll_options (poll_id, text, position) VALUES ($1,$2,$3)",
        [pollId, options[i], i]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { option_id } = req.body;

    const { rows: poll } = await pool.query("SELECT * FROM polls WHERE id=$1", [id]);
    if (!poll.length) return res.status(404).json({ error: "Poll not found" });
    if (poll[0].ends_at && new Date(poll[0].ends_at) < new Date())
      return res.status(400).json({ error: "Poll has ended" });

    await pool.query(
      "INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3) ON CONFLICT (poll_id,user_id) DO UPDATE SET option_id=$2",
      [id, option_id, req.user.id]
    );
    res.json({ message: "Vote recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deletePoll = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM polls WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    if (rows[0].created_by !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });
    await pool.query("DELETE FROM polls WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getLeaderboard, getUserProfile,
  getConversations, getOrCreateConversation, getDmMessages, sendDm,
  getPolls, createPoll, votePoll, deletePoll,
};
