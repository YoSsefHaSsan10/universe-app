const express = require("express");
const router  = express.Router();
const path    = require("path");
const multer  = require("multer");
const ctrl    = require("../controllers/academicController");
const { authMiddleware, requireRole } = require("../middleware/auth");

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(authMiddleware);

// Grades (student manages their own)
router.get("/grades",         ctrl.getGrades);
router.post("/grades",        ctrl.addGrade);
router.delete("/grades/:id",  ctrl.deleteGrade);

// Assessments per course
router.get("/courses/:course_id/assessments",   ctrl.getAssessments);
router.post("/courses/:course_id/assessments",  requireRole("instructor","admin"), ctrl.createAssessment);
router.delete("/assessments/:id",               requireRole("instructor","admin"), ctrl.deleteAssessment);

// Submissions
router.post("/assessments/:assessment_id/submit", upload.single("file"), ctrl.submitAssignment);
router.get("/assessments/:assessment_id/submissions", requireRole("instructor","admin"), ctrl.getSubmissions);
router.patch("/submissions/:sub_id/grade", requireRole("instructor","admin"), ctrl.gradeSubmission);

// Attendance
router.get("/courses/:course_id/attendance",         ctrl.getAttendanceSessions);
router.post("/courses/:course_id/attendance",        requireRole("instructor","admin"), ctrl.createAttendanceSession);
router.patch("/attendance/:session_id/mark",         requireRole("instructor","admin"), ctrl.markAttendance);
router.get("/courses/:course_id/attendance/mine",    ctrl.getMyAttendance);

module.exports = router;
