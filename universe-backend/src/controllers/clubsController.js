const pool = require("../config/db");

/* ── GET /api/clubs  ── browse all clubs with membership status ── */
const getAllClubs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.color,
              (SELECT COUNT(*) FROM club_members WHERE club_id = c.id AND status='approved') AS member_count,
              cm.status AS my_status,
              cm.role   AS my_role
       FROM clubs c
       LEFT JOIN club_members cm ON cm.club_id = c.id AND cm.user_id = $1
       ORDER BY c.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── GET /api/clubs/mine  ── only approved clubs for sidebar ── */
const getMyClubs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.color, cm.role, cm.status
       FROM clubs c
       JOIN club_members cm ON cm.club_id = c.id
       WHERE cm.user_id = $1 AND cm.status = 'approved'
       ORDER BY c.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── GET /api/clubs/:id/channels  ── */
// approved members: all channels; non-members/pending: only is_general channels
const getChannels = async (req, res) => {
  try {
    const membership = await pool.query(
      "SELECT role, status FROM club_members WHERE club_id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    const isApproved = membership.rows.length && membership.rows[0].status === "approved";
    const isAdmin    = req.user.role === "admin";

    const { rows } = await pool.query(
      `SELECT id, name, description, is_general, created_at
       FROM club_channels
       WHERE club_id = $1 ${isApproved || isAdmin ? "" : "AND is_general = TRUE"}
       ORDER BY is_general DESC, name`,
      [req.params.id]
    );
    res.json({ channels: rows, my_role: membership.rows[0]?.role || null, my_status: membership.rows[0]?.status || null });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── POST /api/clubs/:id/channels  ── manager only ── */
const createChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Channel name required" });

    const m = await pool.query(
      "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
      [req.params.id, req.user.id]
    );
    if (!m.rows.length || !["manager", "admin"].includes(m.rows[0].role)) {
      if (req.user.role !== "admin") return res.status(403).json({ error: "Managers only" });
    }

    const { rows } = await pool.query(
      "INSERT INTO club_channels (club_id, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING *",
      [req.params.id, name.toLowerCase().replace(/\s+/g, "-"), description || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── DELETE /api/clubs/:id/channels/:cid  ── manager only ── */
const deleteChannel = async (req, res) => {
  try {
    const ch = await pool.query("SELECT is_general FROM club_channels WHERE id=$1 AND club_id=$2", [req.params.cid, req.params.id]);
    if (!ch.rows.length) return res.status(404).json({ error: "Not found" });
    if (ch.rows[0].is_general) return res.status(400).json({ error: "Cannot delete the general channel" });

    const m = await pool.query(
      "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
      [req.params.id, req.user.id]
    );
    if ((!m.rows.length || !["manager","admin"].includes(m.rows[0].role)) && req.user.role !== "admin") {
      return res.status(403).json({ error: "Managers only" });
    }
    await pool.query("DELETE FROM club_channels WHERE id=$1", [req.params.cid]);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── POST /api/clubs/:id/join  ── request membership ── */
const requestJoin = async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT status FROM club_members WHERE club_id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      const s = existing.rows[0].status;
      return res.status(400).json({ error: s === "pending" ? "Request already sent" : s === "approved" ? "Already a member" : "Your request was rejected" });
    }
    await pool.query(
      "INSERT INTO club_members (club_id, user_id, role, status) VALUES ($1,$2,'member','pending')",
      [req.params.id, req.user.id]
    );
    res.status(201).json({ message: "Join request sent" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── DELETE /api/clubs/:id/leave  ── */
const leaveClub = async (req, res) => {
  try {
    await pool.query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ message: "Left club" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── GET /api/clubs/:id/members  ── approved members (manager/admin) ── */
const getClubMembers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.avatar_color, u.is_online,
              cm.role, cm.status, cm.joined_at
       FROM users u
       JOIN club_members cm ON cm.user_id = u.id
       WHERE cm.club_id = $1
       ORDER BY cm.role DESC, u.full_name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── PATCH /api/clubs/:id/members/:uid  ── approve/reject/role (manager) ── */
const updateMember = async (req, res) => {
  try {
    const { status, role } = req.body;
    // Only managers or admins
    const m = await pool.query(
      "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
      [req.params.id, req.user.id]
    );
    if ((!m.rows.length || !["manager","admin"].includes(m.rows[0].role)) && req.user.role !== "admin") {
      return res.status(403).json({ error: "Managers only" });
    }

    const updates = [];
    const params  = [];
    if (status) { params.push(status); updates.push(`status=$${params.length}`); }
    if (role)   { params.push(role);   updates.push(`role=$${params.length}`); }
    if (!updates.length) return res.status(400).json({ error: "Nothing to update" });

    params.push(req.params.id, req.params.uid);
    const { rows } = await pool.query(
      `UPDATE club_members SET ${updates.join(",")} WHERE club_id=$${params.length-1} AND user_id=$${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── DELETE /api/clubs/:id/members/:uid  ── remove member (manager) ── */
const removeMember = async (req, res) => {
  try {
    const m = await pool.query(
      "SELECT role FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='approved'",
      [req.params.id, req.user.id]
    );
    if ((!m.rows.length || !["manager","admin"].includes(m.rows[0].role)) && req.user.role !== "admin") {
      return res.status(403).json({ error: "Managers only" });
    }
    await pool.query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2", [req.params.id, req.params.uid]);
    res.json({ message: "Removed" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ── GET /api/clubs/:id/general-posts  ── public announcements for non-members ── */
const getGeneralPosts = async (req, res) => {
  try {
    // Get the general channel for this club
    const ch = await pool.query("SELECT id FROM club_channels WHERE club_id=$1 AND is_general=TRUE LIMIT 1", [req.params.id]);
    if (!ch.rows.length) return res.json([]);
    const channelId = ch.rows[0].id;
    const { rows } = await pool.query(
      `SELECT m.id, m.content, m.sent_at, u.full_name AS sender_name, u.avatar_color
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.channel_type='club_channel' AND m.channel_id=$1
       ORDER BY m.sent_at DESC LIMIT 20`,
      [channelId]
    );
    res.json(rows.reverse());
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

module.exports = {
  getAllClubs, getMyClubs, getChannels, createChannel, deleteChannel,
  requestJoin, leaveClub, getClubMembers, updateMember, removeMember, getGeneralPosts,
};
