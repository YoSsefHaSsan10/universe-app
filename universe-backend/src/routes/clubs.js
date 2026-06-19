const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/clubsController");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// Browse & sidebar
router.get("/",           ctrl.getAllClubs);
router.get("/mine",       ctrl.getMyClubs);

// Club channels
router.get("/:id/channels",              ctrl.getChannels);
router.post("/:id/channels",             ctrl.createChannel);
router.delete("/:id/channels/:cid",      ctrl.deleteChannel);

// Membership
router.post("/:id/join",                 ctrl.requestJoin);
router.delete("/:id/leave",              ctrl.leaveClub);

// Members management (manager/admin)
router.get("/:id/members",               ctrl.getClubMembers);
router.patch("/:id/members/:uid",        ctrl.updateMember);
router.delete("/:id/members/:uid",       ctrl.removeMember);

// Public general posts (no auth restriction — any logged in user)
router.get("/:id/general-posts",         ctrl.getGeneralPosts);

module.exports = router;
