const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/pushController");
const { authMiddleware } = require("../middleware/auth");

router.get("/vapid-public-key", ctrl.getVapidKey);
router.use(authMiddleware);
router.get("/status",      ctrl.getStatus);
router.post("/subscribe",  ctrl.subscribe);
router.delete("/unsubscribe", ctrl.unsubscribe);

module.exports = router;
