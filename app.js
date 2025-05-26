const express = require("express");
const serverless = require("serverless-http");
const connectDatabase = require("./db/Database");
const quizRoutes = require("./routes/quizRoutes");
const resultRoutes = require("./routes/resultRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");

// Connect DB
connectDatabase();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8000",
  "http://13.60.95.182:8000",
  "https://quiz-app-three-plum.vercel.app",
  "https://quiz-app-zdp4.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Optional health check
app.get("/is", (req, res) => {
  res.send("Server is running!");
});

// API routes
app.use("/api/quiz", quizRoutes);
app.use("/api/result", resultRoutes);
app.use("/api/auth", studentRoutes);
app.use("/api/teacher", teacherRoutes);

// Export for Vercel
const handler = serverless(app);
module.exports = { handler };
