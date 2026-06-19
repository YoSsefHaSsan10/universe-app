const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/socialController");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// Leaderboard
router.get("/leaderboard", ctrl.getLeaderboard);

// Public profiles
router.get("/profile/:id", ctrl.getUserProfile);

// Direct Messages
router.get("/conversations", ctrl.getConversations);
router.post("/conversations", ctrl.getOrCreateConversation);
router.get("/conversations/:id/messages", ctrl.getDmMessages);
router.post("/conversations/:id/messages", ctrl.sendDm);

// Polls
router.get("/polls",           ctrl.getPolls);
router.post("/polls",          ctrl.createPoll);
router.post("/polls/:id/vote", ctrl.votePoll);
router.delete("/polls/:id",    ctrl.deletePoll);

module.exports = router;
