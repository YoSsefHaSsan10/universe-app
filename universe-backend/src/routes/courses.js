const express = require("express");
const router  = express.Router();
const path    = require("path");
const multer  = require("multer");
const ctrl    = require("../controllers/coursesController");
const mCtrl   = require("../controllers/materialsController");
const { authMiddleware, requireRole } = require("../middleware/auth");
const { cache, invalidateFor } = require("../middleware/cache");

// Multer — save PDFs/files to /uploads with original extension
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.use(authMiddleware);

router.get("/",            cache(300, "courses"),         ctrl.getMyCourses);
router.get("/:id",         cache(300, "courses"),         ctrl.getCourse);
router.get("/:id/members", cache(120, "course-members"),  ctrl.getCourseMembers);

router.post("/",         requireRole("admin"), invalidateFor("courses"), ctrl.createCourse);
router.post("/:id/join", invalidateFor("courses", "course-members"), ctrl.joinCourse);

// Materials — instructor or admin
router.get("/:id/materials",          requireRole("instructor","admin"), mCtrl.getMaterials);
router.post("/:id/materials",         requireRole("instructor","admin"), upload.single("file"), mCtrl.addMaterial);
router.delete("/:id/materials/:mid",  requireRole("instructor","admin"), mCtrl.deleteMaterial);

module.exports = router;
