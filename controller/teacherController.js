
// controllers/teacherController.js
const Teacher = require("../models/teacher");
const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/ErrorHandler");
const sendMail = require("../utils/sendMail");
const sendTeacherToken = require("../utils/sendTeacherToken");

// Create Teacher
exports.createTeacher = async (req, res, next) => {
    try {
        const { email, name, password } = req.body;
        console.log("🚀 ~ createTeacher ~ req.body:", req.body);
        
        const teacherExists = await Teacher.findOne({ email });
        if (teacherExists) {
            return next(new ErrorHandler("Teacher already exists", 400));
        }
        
        const teacher = { name, email, password };
        const activationToken = createActivationToken(teacher);
        const activationUrl = `http://localhost:8000/api/v1/auth/activation/${activationToken}`;
        
        await sendMail({
            email,
            subject: "Activate your account",
            message: `Hello ${name}, please click on the link to activate your account: ${activationUrl}`,
        });
        
        res.status(201).json({
            success: true,
            message: `Please check your email: ${email} to activate your account!`,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
};

// Activate Teacher
exports.activateTeacher = async (req, res, next) => {
    try {
        const { token } = req.params;
        const newTeacher = jwt.verify(token, process.env.ACTIVATION_SECRET);
        
        if (!newTeacher) {
            return next(new ErrorHandler("Invalid token", 400));
        }
        
        const { name, email, password } = newTeacher;
        let teacher = await Teacher.findOne({ email });
        
        if (teacher) {
            return next(new ErrorHandler("Teacher already exists", 400));
        }
        
        teacher = await Teacher.create({ name, email, password });
        
        res.status(201).json({
            success: true,
            message: "Account activated successfully!",
        });
    } catch (error) {
        return next(new ErrorHandler("Activation failed. Token may be expired.", 500));
    }
};

// Login Teacher
exports.loginTeacher = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler("Please provide all fields!", 400));
        }
        
        const teacher = await Teacher.findOne({ email }).select("+password");
        if (!teacher) {
            return next(new ErrorHandler("User doesn't exist!", 400));
        }
        
        const isPasswordValid = await teacher.comparePassword(password);
        if (!isPasswordValid) {
            return next(new ErrorHandler("Incorrect credentials", 400));
        }
        
        sendTeacherToken(teacher, 201, res);
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
};

// Create activation token
const createActivationToken = (teacher) => {
    console.log("🚀 ~ createActivationToken ~ teacher:", teacher);
    return jwt.sign(teacher, process.env.ACTIVATION_SECRET, { expiresIn: "5m" });
};
