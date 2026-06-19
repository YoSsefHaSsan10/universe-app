const webpush = require("web-push");
const pool    = require("../config/db");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL    || "mailto:admin@universe.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a single user.
 * @param {number} userId
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 */
async function sendPushToUser(userId, payload) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM push_subscriptions WHERE user_id = $1",
      [userId]
    );
    const data = JSON.stringify({ ...payload, icon: "/icon.png" });
    for (const sub of rows) {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      webpush.sendNotification(pushSub, data).catch(async (err) => {
        // 410 Gone = subscription expired, clean it up
        if (err.statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
        }
      });
    }
  } catch (err) {
    console.error("Push error:", err.message);
  }
}

/**
 * Send push notification to all users in an array.
 */
async function sendPushToMany(userIds, payload) {
  await Promise.all(userIds.map(uid => sendPushToUser(uid, payload)));
}

module.exports = { sendPushToUser, sendPushToMany };
