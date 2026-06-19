const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/tasksController");
const { authMiddleware } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/", cache(30, "tasks"), ctrl.getTasks);  // 30 s — tasks change often

// Every write busts both tasks and home-summary (pending_tasks count)
router.post("/",             invalidateFor("tasks", "home-summary"), ctrl.createTask);
router.patch("/:id/toggle",  invalidateFor("tasks", "home-summary"), ctrl.toggleTask);
router.delete("/:id",        invalidateFor("tasks", "home-summary"), ctrl.deleteTask);

module.exports = router;
