const express = require("express");
const { body } = require("express-validator");
const router  = express.Router();
const { register, login, logout, getMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.post("/register",
  [
    body("full_name").trim().notEmpty().withMessage("Full name required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  validate,
  register
);

router.post("/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login
);

router.post("/logout", authMiddleware, logout);
router.get("/me",      authMiddleware, getMe);

module.exports = router;
