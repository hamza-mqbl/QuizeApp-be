
// create token and saving in cookies
const jwt=require("jsonwebtoken")
const sendTeacherToken = (userId, statuscode, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });

  // option for cookies
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  res.status(statuscode).cookie("teacher_token", token, options).json({
    success: true,
    token,
  });
    console.log("🚀 ~ res.status ~ token:", token)
};
module.exports=sendTeacherToken;