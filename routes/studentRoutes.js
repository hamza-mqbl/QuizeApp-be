const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const {
  createUser, // Generic user creation (for both students and teachers)
  activateUser, // User activation (for both students and teachers)
  loginUser, // User login (for both students and teachers)
  getUser, // Get user data (for both students and teachers)
  logoutUser, // Logout user (for both students and teachers)
  updateUserInfo, // Update user info (for both students and teachers)
  updateUserAvatar, // Update user avatar (for both students and teachers)
} = require("../controller/studentController"); // Modify to generic user controller
const multer = require("multer");

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes for creating, activating, and logging in users (generic for both students and teachers)
router.post("/create-user", createUser); // Generic user creation (with role)
router.post("/activation", activateUser); // User activation
router.post("/login-user", loginUser); // User login

// Routes for getting user data, logging out, and updating info or avatar
router.get("/getuser", isAuthenticated, getUser); // Fetch user data (student/teacher)
router.get("/logout", logoutUser); // Logout user

// Update user info (student or teacher)
router.put("/update-user-info", isAuthenticated, updateUserInfo);

// Update user avatar (student or teacher)
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("avatar"),
  updateUserAvatar
);

module.exports = router;
