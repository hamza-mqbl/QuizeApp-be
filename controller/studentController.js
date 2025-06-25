const User = require("../models/student"); // Change to the new generic User model
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/sendToken");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

// Create User (Student or Teacher)
exports.createUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body; // Added role parameter
    console.log(
      "🚀 ~ exports.createUser=catchAsyncErrors ~ name, email, password, role:",
      name,
      email,
      password,
      role
    );

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorHandler("User already exists", 400));
    }
    console.log(
      "🚀 ~ exports.createUser=catchAsyncErrors ~ userExists:",
      userExists
    );

    const user = new User({ name, email, password, role }); // Role is now passed here
    await user.save();

    const activationToken = createActivationToken(user);
    const activationUrl = `http://localhost:5000/activation/${activationToken}`;

    await sendMail({
      email: user.email,
      subject: "Activate your account",
      message: `Hello ${user.name}, please click the link to activate your account: ${activationUrl}`,
    });

    res.status(201).json({
      success: true,
      message: `Check your email: ${user.email} to activate your account!`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Activate User (Student or Teacher)
exports.activateUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { activation_token } = req.body;
    const decoded = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

    if (!decoded) {
      return next(new ErrorHandler("Invalid token", 400));
    }

    const { name, email, password, role } = decoded;
    let user = await User.findOne({ email });

    if (user) {
      return next(new ErrorHandler("User already exists", 400));
    }

    user = await User.create({ name, email, password, role });
    sendToken(user, 201, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Login User (Student or Teacher)
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return next(
        new ErrorHandler("Please provide email, password and role!", 400)
      );
    }

    const user = await User.findOne({ email, role }).select("+password");
    if (!user) {
      return next(new ErrorHandler("User with this role doesn't exist!", 400));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new ErrorHandler("Invalid credentials", 400));
    }

    sendToken(user, 201, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.getUser = async (req, res) => {
  try {
    const { user_token } = req.cookies;
    if (!user_token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(user_token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.id).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Logout User (Student or Teacher)
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
  try {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(201).json({ success: true, message: "Logout successful!" });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Update User Info (Student or Teacher)
exports.updateUserInfo = catchAsyncErrors(async (req, res, next) => {
  try {
    const { email, password, phoneNumber, name } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new ErrorHandler("Invalid credentials", 400));
    }

    user.name = name;
    user.email = email;
    user.phoneNumber = phoneNumber;

    await user.save();
    res.status(201).json({ success: true, user });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Update User Avatar (Student or Teacher)
exports.updateUserAvatar = catchAsyncErrors(async (req, res, next) => {
  try {
    const existUser = await User.findById(req.user.id);
    if (!existUser) {
      return next(new ErrorHandler("User not found", 400));
    }

    existUser.avatar = req.file.filename;
    await existUser.save();

    res.status(200).json({ success: true, user: existUser });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Create Activation Token
const createActivationToken = (user) => {
  console.log("🚀 ~ createActivationToken ~ user:", user);
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role }, // Include role in the token
    process.env.ACTIVATION_SECRET,
    { expiresIn: "1h" }
  );
};

const bcrypt = require("bcrypt");

// Update user name/email and/or password
exports.updateProfileOrPassword = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Profile info update
    if (name || email) {
      if (name) user.name = name;
      if (email) user.email = email;
    }

    // Password update
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new ErrorHandler("All password fields are required", 400));
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return next(new ErrorHandler("Current password is incorrect", 401));
      }

      if (newPassword !== confirmPassword) {
        return next(new ErrorHandler("New passwords do not match", 400));
      }

      if (newPassword.length < 8) {
        return next(
          new ErrorHandler("New password must be at least 8 characters", 400)
        );
      }

      user.password = newPassword;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};
// Logout User (Student or Teacher)
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
  try {
    // Clear the same cookie used for authentication, typically "user_token"
    res.cookie("user_token", "", {
      httpOnly: true,
      expires: new Date(0), // expire immediately
      sameSite: "none", // set according to your frontend setup
      secure: true, // ensure you're using HTTPS in production
    });

    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.deleteUserAccount = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user._id; // assuming you're using JWT & `isAuthenticated` middleware

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await user.deleteOne();

    res.cookie("user_token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

const crypto = require("crypto");

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  console.log("🚀 ~ exports.forgotPassword=catchAsyncErrors ~ user:", user);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordTime = Date.now() + 15 * 60 * 1000; // 15 minutes

  await user.save({ validateBeforeSave: false });

  const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

  await sendMail({
    email: user.email,
    subject: "Password Reset",
    message: `Click the link to reset your password: ${resetUrl}`,
  });

  res.status(200).json({
    success: true,
    message: `Password reset email sent to ${user.email}`,
  });
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetToken = req.params.token;

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTime: { $gt: Date.now() },
  });
  console.log("🚀 ~ exports.resetPassword=catchAsyncErrors ~ user:", user);

  if (!user) {
    return next(new ErrorHandler("Token is invalid or has expired", 400));
  }

  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordTime = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
