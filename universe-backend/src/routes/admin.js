const express = require("express");
const router  = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/stats",                ctrl.getStats);

router.get("/users",                ctrl.getUsers);
router.patch("/users/:id/role",     ctrl.updateUserRole);
router.delete("/users/:id",         ctrl.deleteUser);

router.get("/courses",              ctrl.getAllCourses);
router.delete("/courses/:id",       ctrl.deleteCourse);

router.get("/messages",             ctrl.getMessages);
router.delete("/messages/:id",      ctrl.deleteMessage);

router.get("/clubs",                      ctrl.getAdminClubs);
router.post("/clubs",                     ctrl.createAdminClub);
router.delete("/clubs/:id",               ctrl.deleteAdminClub);
router.patch("/clubs/:id/assign-manager", ctrl.assignManager);
router.delete("/clubs/:id/managers/:uid", ctrl.removeManager);

router.get("/analytics",                  ctrl.getAnalytics);
router.post("/courses/:course_id/bulk-enroll", ctrl.bulkEnroll);
router.post("/system-announcement",       ctrl.systemAnnouncement);
router.patch("/notifications/mark-all-read", ctrl.markAllRead);

module.exports = router;
