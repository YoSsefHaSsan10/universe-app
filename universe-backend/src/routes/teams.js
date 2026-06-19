const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/teamsController");
const { authMiddleware } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

router.use(authMiddleware);

router.get("/",      cache(120, "teams"), ctrl.getAllTeams);  // 2 min
router.get("/mine",  cache(120, "teams"), ctrl.getMyTeams);

router.post("/",                     invalidateFor("teams"), ctrl.createTeam);
router.post("/:id/request",          invalidateFor("teams"), ctrl.requestJoin);
router.get("/:id/requests",          cache(60, "team-requests"), ctrl.getRequests);
router.patch("/requests/:requestId", invalidateFor("teams", "team-requests"), ctrl.handleRequest);

module.exports = router;
