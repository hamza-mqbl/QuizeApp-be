const express = require("express");
const quizRoutes = require("./routes/quizRoutes");

const resultRoutes = require("./routes/resultRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const serverless = require("serverless-http");
const connectDatabase = require("./db/Database");
const ErrorHandler = require("./middleware/error");
const cookieParser = require("cookie-parser");

const app = express();
const errorMiddleware = require("./middleware/error");
app.use(express.json());
app.use(cookieParser());

const bodyParser = require("body-parser");
const cors = require("cors");
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://quiz-app-three-plum.vercel.app",
  "https://quiz-app-zdp4.vercel.app",
];
// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use("/", express.static("uploads")); //setup done for 2nd branch
// Increase the payload size limit
app.use(bodyParser.json({ limit: "50mb" })); // Increase limit as needed
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "backend/config/.env",
  });
}
app.get("/is", (req, res) => {
  res.send("Server is running!");
});
const adminRoutes = require("./routes/adminRoutes");

// Routes
app.use("/api/quiz", quizRoutes);
app.use("/api/result", resultRoutes);
app.use("/api/auth", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorMiddleware);
module.exports = app;
module.exports.handler = serverless(app);
