const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/usersController");
const { authMiddleware } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/home-summary",   cache(30,  "home-summary"),   ctrl.getHomeSummary);  // 30 s
router.get("/activity",       cache(60,  "activity"),       ctrl.getActivity);     // 1 min
router.get("/notifications",  cache(30,  "notifications"),  ctrl.getNotifications);
router.get("/settings",       cache(300, "settings"),       ctrl.getSettings);     // 5 min

router.patch("/notifications/:id/read", invalidateFor("notifications", "home-summary"), ctrl.markNotifRead);
router.patch("/profile",  invalidateFor("settings"), ctrl.updateProfile);
router.patch("/password", ctrl.changePassword);
router.patch("/settings", invalidateFor("settings"), ctrl.updateSettings);

module.exports = router;
