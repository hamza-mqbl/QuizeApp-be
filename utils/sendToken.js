const jwt = require("jsonwebtoken");
const sendToken = (userId, statuscode, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });

  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // <- this adds secure flag only in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Needed for cross-site cookies
  };

  res.status(statuscode).cookie("user_token", token, options).json({
    success: true,
    token,
  });
};
module.exports = sendToken;
