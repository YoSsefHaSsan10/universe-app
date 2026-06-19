const cron = require("node-cron");
const pool = require("../config/db");
const { sendPushToUser } = require("./pushService");
const { sendEmail, reminderHtml } = require("./emailService");

function startCronJobs() {
  // ── Every hour: remind users about tasks/assessments due in ~24 h ──
  cron.schedule("0 * * * *", async () => {
    try {
      const now  = new Date();
      const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
      const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h from now

      // Tasks due in window
      const { rows: taskDue } = await pool.query(`
        SELECT t.id, t.title, t.due_date, t.user_id,
               u.full_name, u.email,
               s.notif_reminders
        FROM tasks t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN user_settings s ON s.user_id = t.user_id
        WHERE t.completed = FALSE
          AND t.due_date BETWEEN $1 AND $2
          AND (s.notif_reminders IS NULL OR s.notif_reminders = TRUE)
      `, [from, to]);

      // Group by user
      const byUser = {};
      for (const row of taskDue) {
        if (!byUser[row.user_id]) byUser[row.user_id] = { name: row.full_name, email: row.email, items: [] };
        byUser[row.user_id].items.push({ title: row.title, due: new Date(row.due_date).toLocaleString() });
      }

      for (const [uid, data] of Object.entries(byUser)) {
        // Push notification
        await sendPushToUser(parseInt(uid), {
          title: "⏰ Deadline Reminder",
          body: `${data.items.length} item(s) due in ~24 hours`,
          url: "/",
        });
        // Email reminder
        if (data.email) {
          await sendEmail({
            to: data.email,
            subject: "⏰ Universe — Upcoming Deadlines",
            html: reminderHtml({ name: data.name, items: data.items }),
          });
        }
        // In-app notification
        await pool.query(`
          INSERT INTO notifications (user_id, message, type, link)
          VALUES ($1, $2, 'reminder', '/')
        `, [uid, `⏰ You have ${data.items.length} task(s) due in ~24 hours`]);
      }

      if (taskDue.length) console.log(`[CRON] Sent ${taskDue.length} deadline reminders`);
    } catch (err) {
      console.error("[CRON] Reminder error:", err.message);
    }
  });

  // ── Streak reset: midnight UTC — reset streak if no activity yesterday ──
  cron.schedule("0 0 * * *", async () => {
    try {
      await pool.query(`
        UPDATE study_streaks
        SET current_streak = 0
        WHERE last_activity_date < CURRENT_DATE - INTERVAL '1 day'
      `);
      console.log("[CRON] Streak reset done");
    } catch (err) {
      console.error("[CRON] Streak reset error:", err.message);
    }
  });

  console.log("⏰ Cron jobs started");
}

module.exports = { startCronJobs };
