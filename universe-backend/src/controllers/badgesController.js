const pool = require("../config/db");

// GET /api/badges  — all badges + user's progress
const getBadges = async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT b.id, b.name, b.description, b.tier, b.category, b.icon, b.xp_reward, b.max_xp,
             COALESCE(ub.progress_xp, 0) AS progress_xp,
             COALESCE(ub.earned, FALSE)   AS earned,
             ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
    `;
    const params = [req.user.id];
    if (category && category !== "All Badges") {
      query += ` WHERE b.category = $2`;
      params.push(category);
    }
    query += " ORDER BY b.tier DESC, b.name";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/badges/summary  — total badges + xp + level
const getBadgeSummary = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM user_badges WHERE user_id = $1 AND earned = TRUE) AS earned_count,
         (SELECT COUNT(*) FROM badges)                                            AS total_count,
         x.total_xp,
         x.level_name
       FROM user_xp x WHERE x.user_id = $1`,
      [req.user.id]
    );
    res.json(rows[0] || { earned_count: 0, total_count: 0, total_xp: 0, level_name: "Beginner" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getBadges, getBadgeSummary };
