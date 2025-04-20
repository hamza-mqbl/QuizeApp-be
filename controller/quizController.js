const Quiz = require("../models/Quiz");
const { generateQuizFromPrompt } = require("../services/quizService");
const ErrorHandler = require("../utils/ErrorHandler");

exports.createQuiz = async (req, res, next) => {
  if (req.user.role !== "teacher") {
    return next(
      new ErrorHandler("Access denied: Only teachers can create quizzes", 403)
    );
  }

  try {
    const { title, topic, questions, quizCode } = req.body;
    console.log(
      "🚀 ~ exports.createQuiz= ~ title, topic, questions, quizCode:",
      title,
      topic,
      questions,
      quizCode
    );

    const quiz = new Quiz({
      title,
      topic,
      questions,
      createdBy: req.user._id,
      quizCode,
      isPublished: false, // ✅ default not published
    });

    await quiz.save();

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
exports.publishQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (req.user.role !== "teacher") {
      return next(
        new ErrorHandler("Access denied: Only teachers can create quizzes", 403)
      );
    }
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return next(new ErrorHandler("Quiz not found", 404));
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized: Cannot publish this quiz", 403)
      );
    }

    if (quiz.isPublished) {
      return next(new ErrorHandler("Quiz is already published", 400));
    }

    quiz.isPublished = true;
    await quiz.save();

    res
      .status(200)
      .json({ success: true, message: "Quiz published successfully" });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
exports.getMyQuizzes = async (req, res, next) => {
  try {
    // Only allow teacher to view their quizzes
    if (req.user.role !== "teacher") {
      return next(
        new ErrorHandler(
          "Access denied: Only teachers can view their quizzes",
          403
        )
      );
    }

    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .populate("createdBy", "name email") // optional: show teacher name/email
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
exports.publishQuizResult = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (req.user.role !== "teacher") {
      return next(
        new ErrorHandler("Access denied: Only teachers can create quizzes", 403)
      );
    }
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Ensure only the teacher who created the quiz can publish results
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized: Cannot publish this quiz", 403)
      );
    }

    // Publish results for all students
    quiz.submissions.forEach((submission) => {
      submission.resultPublished = true;
    });
    quiz.resultsPublished = true; // ✅ ADD THIS
    await quiz.save();
    res.status(200).json({ message: "Quiz results published successfully" });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
exports.getQuizResults = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const studentId = req.student._id.toString(); // Fix here
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Find the student's submission
    const submission = quiz.submissions.find(
      (sub) => sub.studentId.toString() === studentId
    );

    if (!submission) {
      return res
        .status(404)
        .json({ message: "No submission found for this quiz" });
    }

    if (!submission.resultPublished) {
      return res.status(403).json({ message: "Results are not published yet" });
    }

    res.status(200).json({
      message: "Quiz results",
      score: submission.score,
      answers: submission.answers,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    const { topic, numberOfQuestions } = req.body;
    console.log("🚀 ~ exports.generateQuiz= ~ req.body:", req.body);
    const questions = await generateQuizFromPrompt(topic, numberOfQuestions); // Integrate Hugging Face here
    const quiz = new Quiz({
      title: `AI Generated Quiz on ${topic}`,
      topic,
      questions,
      createdBy: req.user.id,
      quizCode: generateUniqueCode(),
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getQuizByCode = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      quizCode: req.params.quizCode,
      isPublished: true,
    }); // ✅ Only published quizzes
    if (!quiz) {
      return next(new ErrorHandler("Quiz not found or not published", 404));
    }
    res.status(200).json({ success: true, quiz });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// student quizes

// GET all published quizzes (for students)
exports.getAllPublishedQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true })
      .select("title topic questions createdAt quizCode") // Select only needed fields
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const studentId = req.user._id.toString();

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers format" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const alreadySubmitted = quiz.submissions.find(
      (sub) => sub.studentId.toString() === studentId
    );
    if (alreadySubmitted) {
      return res
        .status(400)
        .json({ message: "You have already submitted this quiz" });
    }

    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        message:
          "Incomplete submission. Please attempt all questions (even if you skip, send empty string '')",
      });
    }

    // Calculate Score
    let score = 0;
    quiz.questions.forEach((question, index) => {
      const studentAnswer = answers[index]?.trim() || "";
      if (studentAnswer && studentAnswer === question.correctAnswer) {
        score++;
      }
    });

    // Save Submission
    quiz.submissions.push({
      studentId,
      answers,
      score,
      resultPublished: false,
    });
    await quiz.save();

    res
      .status(201)
      .json({ success: true, message: "Quiz submitted successfully", score });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler(error.message, 400));
  }
};
exports.getStudentRecentResults = async (req, res, next) => {
  try {
    const studentId = req.user._id.toString();

    const quizzes = await Quiz.find({ "submissions.studentId": studentId })
      .select("title createdAt submissions questions") // ✅ include questions
      .sort({ createdAt: -1 });
    console.log("🚀 ~ exports.getStudentRecentResults= ~ quizzes:", quizzes);

    const results = [];
    console.log("🚀 ~ exports.getStudentRecentResults= ~ results:", results);

    quizzes.forEach((quiz) => {
      const submission = quiz.submissions.find(
        (sub) =>
          sub.studentId.toString() === studentId && sub.resultPublished === true
      );
      console.log("🚀 ~ quizzes.forEach ~ submission:", submission);

      if (submission) {
        results.push({
          id: quiz._id,
          title: quiz.title,
          score: `${Math.round(
            (submission.score / quiz.questions.length) * 100
          )}%`,
          date: quiz.createdAt.toISOString().split("T")[0],
          status:
            submission.score >= quiz.questions.length * 0.6
              ? "passed"
              : "failed",
        });
      }
    });

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler(error.message, 400));
  }
};

exports.getStudentQuizDetails = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user._id.toString();

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const submission = quiz.submissions.find(
      (sub) => sub.studentId.toString() === studentId
    );

    if (!submission) {
      return res
        .status(404)
        .json({ message: "No submission found for this quiz" });
    }

    if (!submission.resultPublished) {
      return res.status(403).json({ message: "Results not published yet" });
    }

    const detailedResults = quiz.questions.map((question, index) => {
      return {
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: submission.answers[index] || "Not answered",
        isCorrect: submission.answers[index] === question.correctAnswer,
      };
    });

    res.status(200).json({
      success: true,
      title: quiz.title,
      score: `${Math.round((submission.score / quiz.questions.length) * 100)}%`,
      totalQuestions: quiz.questions.length,
      correctAnswers: submission.score,
      questions: detailedResults,
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler(error.message, 400));
  }
};
