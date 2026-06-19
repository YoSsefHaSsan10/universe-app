const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/messagesController");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

router.get("/",         ctrl.getMessages);
router.post("/",        ctrl.sendMessage);
router.delete("/:id",   ctrl.deleteMessage);

module.exports = router;
