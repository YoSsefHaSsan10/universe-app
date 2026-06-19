const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/announcementsController");
const { authMiddleware, requireRole } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/", cache(120, "announcements"), ctrl.getAnnouncements); // 2 min

router.post("/",         requireRole("instructor", "admin"), invalidateFor("announcements"), ctrl.createAnnouncement);
router.patch("/:id/pin", requireRole("instructor", "admin"), invalidateFor("announcements"), ctrl.togglePin);
router.delete("/:id",    requireRole("instructor", "admin"), invalidateFor("announcements"), ctrl.deleteAnnouncement);

module.exports = router;
