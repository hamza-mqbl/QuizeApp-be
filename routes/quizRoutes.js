const express = require("express");
const router = express.Router();
const quizController = require("../controller/quizController");
const authMiddleware = require("../middleware/authMiddleware");
const { isAuthenticated } = require("../middleware/auth");

// Create quiz (teacher only)
router.post("/create", isAuthenticated, quizController.createQuiz);
router.get(
  "/getTeacherDashboardStats",
  isAuthenticated,
  quizController.getTeacherDashboardStats
);
router.get(
  "/students/my-students",
  isAuthenticated,
  quizController.getMyStudents
);
router.get(
  "/students/performance/:studentId",
  isAuthenticated,
  quizController.getStudentPerformance
);
router.get(
  "/subjects-performance",
  isAuthenticated,
  quizController.getSubjectPerformance
);
router.get(
  "/students/activity-log",
  isAuthenticated,
  quizController.getStudentActivityLog
);

router.get("/get-my-quiz/:id", isAuthenticated, quizController.getQuizById); //get single quize by quiz id and teacher id
router.put("/update-my-quiz/:id", isAuthenticated, quizController.updateQuiz); //get single quize by quiz id and teacher id

router.get("/my-quizzes", isAuthenticated, quizController.getMyQuizzes);
router.put("/publish/:quizId", isAuthenticated, quizController.publishQuiz); // ✅ new publish route
router.post("/submit/:quizId", isAuthenticated, quizController.submitQuiz);
router.put(
  "/publish-result/:quizId",
  isAuthenticated,
  quizController.publishQuizResult
);
router.get("/results/:quizId", isAuthenticated, quizController.getQuizResults);

// Generate quiz using AI (teacher only)
router.post("/generate", authMiddleware, quizController.generateQuiz);

// Get quiz by code (student access)

// studentRoutes.js
router.get("/join/:quizCode", quizController.getQuizByCode);
router.get(
  "/all-quize",
  isAuthenticated, //for single student
  quizController.getAllPublishedQuizzes
);
router.get(
  "/student/recent-results",
  isAuthenticated, //for single student
  quizController.getStudentRecentResults
);
router.get(
  "/student/result/:quizId", //for single student
  isAuthenticated,
  quizController.getStudentQuizDetails
);

module.exports = router;
