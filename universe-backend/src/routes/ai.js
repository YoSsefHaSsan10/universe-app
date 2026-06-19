const express = require("express");
const router  = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/aiController");

// Chat (all logged-in users)
router.post("/chat",           authMiddleware, ctrl.chat);
router.get("/status",          authMiddleware, ctrl.getStatus);

// Training data management (admin only)
router.get("/training-pairs",         authMiddleware, requireRole("admin"), ctrl.getTrainingPairs);
router.post("/training-pairs",        authMiddleware, requireRole("admin"), ctrl.addTrainingPair);
router.delete("/training-pairs/:id",  authMiddleware, requireRole("admin"), ctrl.deleteTrainingPair);
router.post("/reindex",               authMiddleware, requireRole("admin"), ctrl.reindex);

module.exports = router;
