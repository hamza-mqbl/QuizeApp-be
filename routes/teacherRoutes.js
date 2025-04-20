// routes/teacherRoutes.js
const express = require("express");
const router = express.Router();
const { createTeacher, activateTeacher, loginTeacher } = require("../controller/teacherController");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/create-teacher", upload.single("file"), catchAsyncErrors(createTeacher));
router.get("/activation/:token", catchAsyncErrors(activateTeacher));
router.post("/login-teacher", catchAsyncErrors(loginTeacher));

module.exports = router;