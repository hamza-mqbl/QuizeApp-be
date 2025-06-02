const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");

const User = require("../models/student"); // ✅ Only User model

// Authentication middleware
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { user_token } = req.cookies;
  console.log(
    "🚀 ~ exports.isAuthenticated=catchAsyncErrors ~ user_token:",
    user_token
  );

  if (!user_token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decoded = jwt.verify(user_token, process.env.JWT_SECRET_KEY);

  if (!decoded || !decoded.id) {
    return next(new ErrorHandler("Invalid token. Please login again.", 401));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  req.user = user; // ✅ Attach user directly
  next();
});

exports.isAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ErrorHandler("Access denied: Admins only", 403));
  }
  next();
};
