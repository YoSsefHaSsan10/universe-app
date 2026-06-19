const pool = require("../config/db");

// GET /api/teams  — all teams (with joined status)
const getAllTeams = async (req, res) => {
  try {
    const { course_id } = req.query;
    let query = `
      SELECT t.id, t.name, t.description, t.type, t.max_members, t.level_req, t.status,
             t.created_at, c.name AS course_name, c.code AS course_code, c.color AS course_color,
             u.full_name AS leader_name,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
             EXISTS(SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = $1) AS is_member,
             (SELECT COUNT(*) FROM team_requests WHERE team_id = t.id AND status = 'pending') AS pending_requests
      FROM teams t
      LEFT JOIN courses c ON c.id = t.course_id
      LEFT JOIN users u ON u.id = t.created_by
    `;
    const params = [req.user.id];
    if (course_id) { query += " WHERE t.course_id = $2"; params.push(course_id); }
    query += " ORDER BY t.created_at DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/teams/mine
const getMyTeams = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.name, t.status, c.code AS course_code, c.color AS course_color,
              tm.role AS my_role,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
              (SELECT COUNT(*) FROM team_requests WHERE team_id = t.id AND status = 'pending') AS pending_requests
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
       LEFT JOIN courses c ON c.id = t.course_id
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/teams
const createTeam = async (req, res) => {
  try {
    const { name, course_id, description, type, max_members, level_req } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO teams (name, course_id, description, type, max_members, level_req, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, course_id, description, type || "Study Group", max_members || 5, level_req || "Any", req.user.id]
    );
    // Creator joins as leader
    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES ($1,$2,'leader')",
      [rows[0].id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/teams/:id/request  — request to join
const requestJoin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team is full
    const team = await pool.query(
      `SELECT t.max_members,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t WHERE t.id = $1`,
      [id]
    );
    if (!team.rows.length) return res.status(404).json({ error: "Team not found" });
    if (parseInt(team.rows[0].member_count) >= team.rows[0].max_members)
      return res.status(400).json({ error: "Team is full" });

    await pool.query(
      "INSERT INTO team_requests (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [id, req.user.id]
    );
    res.json({ message: "Request sent" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/teams/:id/requests  — leader sees pending requests
const getRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT tr.id, tr.status, tr.requested_at, u.id AS user_id, u.full_name, u.avatar_color
       FROM team_requests tr
       JOIN users u ON u.id = tr.user_id
       WHERE tr.team_id = $1 AND tr.status = 'pending'`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/teams/requests/:requestId  — accept or reject
const handleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;  // 'accept' | 'reject'

    const reqRow = await pool.query(
      "SELECT * FROM team_requests WHERE id = $1", [requestId]
    );
    if (!reqRow.rows.length) return res.status(404).json({ error: "Request not found" });

    if (action === "accept") {
      await pool.query(
        "INSERT INTO team_members (team_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [reqRow.rows[0].team_id, reqRow.rows[0].user_id]
      );
    }

    await pool.query(
      "UPDATE team_requests SET status = $1 WHERE id = $2",
      [action === "accept" ? "accepted" : "rejected", requestId]
    );

    res.json({ message: `Request ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAllTeams, getMyTeams, createTeam, requestJoin, getRequests, handleRequest };
