const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/eventsController");
const { authMiddleware } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/",    cache(180, "events"), ctrl.getEvents);   // 3 min

router.post("/",    invalidateFor("events"), ctrl.createEvent);
router.delete("/:id", invalidateFor("events"), ctrl.deleteEvent);

module.exports = router;
