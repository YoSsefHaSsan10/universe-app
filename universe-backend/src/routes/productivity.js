const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/productivityController");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

router.get("/streak",       ctrl.getStreak);
router.post("/streak/touch", ctrl.touchStreak);

router.get("/goals",        ctrl.getGoals);
router.post("/goals",       ctrl.createGoal);
router.patch("/goals/:id/complete", ctrl.completeGoal);
router.delete("/goals/:id", ctrl.deleteGoal);

module.exports = router;
