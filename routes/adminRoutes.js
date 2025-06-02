const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware/auth");
const adminController = require("../controller/adminController");

router.get("/users", adminController.getAllStudentsOptimized);
router.get("/quizzes", isAdmin, adminController.getAllQuizzes);
router.get("/dashboard-stats", adminController.getAdminDashboardStats);
router.get("/teachers", adminController.getAllTeachers);
router.delete("/deleteTeacher/:id", adminController.deleteTeacherAndQuizzes);
router.delete("/deleteUser/:id", adminController.deleteUser);

module.exports = router;
