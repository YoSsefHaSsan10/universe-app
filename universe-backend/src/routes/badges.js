const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/badgesController");
const { authMiddleware } = require("../middleware/auth");
const { cache } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/",        cache(3600, "badges"),         ctrl.getBadges);       // 1 h — definitions rarely change
router.get("/summary", cache(300,  "badges-summary"), ctrl.getBadgeSummary); // 5 min

module.exports = router;
