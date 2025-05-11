const Quiz = require("../models/Quiz");
const { generateQuizFromPrompt } = require("../services/quizService");
const ErrorHandler = require("../utils/ErrorHandler");
const User = require("../models/student"); // ✅ Make sure you have this model imported

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
exports.getTeacherDashboardStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // Get all quizzes by this teacher
    const quizzes = await Quiz.find({ createdBy: teacherId }).select(
      "submissions createdAt questions topic title"
    );

    const recentQuizzesSet = quizzes.filter((q) => q.createdAt >= sevenDaysAgo);
    const previousWeekQuizzes = quizzes.filter(
      (q) => q.createdAt < sevenDaysAgo && q.createdAt >= fourteenDaysAgo
    );

    const allSubmissions = quizzes.flatMap((q) => q.submissions);
    const recentSubmissions = recentQuizzesSet.flatMap((q) => q.submissions);
    const previousWeekSubmissions = previousWeekQuizzes.flatMap(
      (q) => q.submissions
    );

    const activeStudents = [
      ...new Set(allSubmissions.map((s) => s.studentId.toString())),
    ];
    const recentActiveStudents = [
      ...new Set(recentSubmissions.map((s) => s.studentId.toString())),
    ];
    const previousActiveStudents = [
      ...new Set(previousWeekSubmissions.map((s) => s.studentId.toString())),
    ];

    const totalQuizzes = quizzes.length;

    const getAverageScore = (subs, quizSet) => {
      const totalScore = subs.reduce((sum, s) => sum + s.score, 0);
      const totalQuestions = quizSet.reduce(
        (sum, q) => sum + q.questions.length * q.submissions.length,
        0
      );
      return totalQuestions > 0
        ? Math.round((totalScore / totalQuestions) * 100)
        : 0;
    };

    const averageScore = getAverageScore(allSubmissions, quizzes);
    const recentAverageScore = getAverageScore(
      recentSubmissions,
      recentQuizzesSet
    );
    const previousAverageScore = getAverageScore(
      previousWeekSubmissions,
      previousWeekQuizzes
    );

    // Top performers
    const studentScoresMap = {};
    quizzes.forEach((quiz) => {
      quiz.submissions.forEach((submission) => {
        const studentId = submission.studentId.toString();
        if (!studentScoresMap[studentId]) {
          studentScoresMap[studentId] = { totalScore: 0, attempts: 0 };
        }
        studentScoresMap[studentId].totalScore += submission.score;
        studentScoresMap[studentId].attempts += quiz.questions.length;
      });
    });

    const topPerformersRaw = Object.entries(studentScoresMap)
      .map(([studentId, data]) => ({
        studentId,
        avgScore:
          data.attempts > 0
            ? Math.round((data.totalScore / data.attempts) * 100)
            : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    const studentIds = topPerformersRaw.map((s) => s.studentId);
    const studentDocs = await User.find({ _id: { $in: studentIds } }).select(
      "name"
    );

    const topPerformers = topPerformersRaw.map((p) => {
      const match = studentDocs.find((s) => s._id.toString() === p.studentId);
      return {
        name: match?.name || "Unknown",
        avgScore: `${p.avgScore}%`,
      };
    });

    // Performance data by subject
    const topicMap = {};
    quizzes.forEach((quiz) => {
      const topic = quiz.topic;
      if (!topicMap[topic]) {
        topicMap[topic] = [];
      }
      quiz.submissions.forEach((sub) => {
        const totalPossible = quiz.questions.length;
        const percentageScore =
          totalPossible > 0 ? Math.round((sub.score / totalPossible) * 100) : 0;
        topicMap[topic].push(percentageScore);
      });
    });

    const performanceData = Object.entries(topicMap).map(
      ([subject, scores]) => {
        const avg =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        const highest = scores.length > 0 ? Math.max(...scores) : 0;
        const lowest = scores.length > 0 ? Math.min(...scores) : 0;
        return { subject, avg, highest, lowest };
      }
    );

    // Activity Data (last 7 days)
    const dayMap = {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
    };

    const activityMap = {
      Sun: { quizzes: 0, students: new Set() },
      Mon: { quizzes: 0, students: new Set() },
      Tue: { quizzes: 0, students: new Set() },
      Wed: { quizzes: 0, students: new Set() },
      Thu: { quizzes: 0, students: new Set() },
      Fri: { quizzes: 0, students: new Set() },
      Sat: { quizzes: 0, students: new Set() },
    };

    quizzes.forEach((quiz) => {
      const quizDate = new Date(quiz.createdAt);
      if (quizDate >= sevenDaysAgo) {
        const quizDay = dayMap[quizDate.getDay()];
        activityMap[quizDay].quizzes += 1;
        quiz.submissions.forEach((sub) => {
          activityMap[quizDay].students.add(sub.studentId.toString());
        });
      }
    });

    const activityData = Object.entries(activityMap).map(
      ([day, { quizzes, students }]) => ({
        name: day,
        quizzes,
        students: students.size,
      })
    );

    // Recent Quizzes Section (latest 5)
    const sortedQuizzes = [...quizzes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const recentQuizzes = sortedQuizzes.slice(0, 5).map((quiz) => {
      const totalPossible = quiz.questions.length;
      const totalSubmissions = quiz.submissions.length;
      const avgScore =
        totalSubmissions > 0
          ? Math.round(
              (quiz.submissions.reduce((sum, s) => sum + s.score, 0) /
                totalSubmissions /
                totalPossible) *
                100
            )
          : 0;

      return {
        id: quiz._id,
        title: quiz.title,
        topic: quiz.topic,
        questions: totalPossible,
        createdAt: quiz.createdAt,
        submissions: totalSubmissions,
        avgScore,
      };
    });

    // ✅ Final Response
    res.status(200).json({
      success: true,
      stats: {
        totalQuizzes,
        activeStudents: activeStudents.length,
        recentActivity: recentQuizzesSet.length,
        previousActivity: previousWeekQuizzes.length,
        averageScore: `${averageScore}%`,
        recentAverageScore,
        previousAverageScore,
        recentActiveStudents: recentActiveStudents.length,
        previousActiveStudents: previousActiveStudents.length,
        topPerformers,
        performanceData,
        activityData,
        recentQuizzes, // ✅ Added here
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
// GET /api/quiz/:id
exports.getQuizById = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Optional: Check ownership if needed
    if (
      req.user.role !== "teacher" ||
      quiz.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    res.status(200).json({ success: true, quiz });
  } catch (err) {
    console.error("❌ Error fetching quiz:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/quiz/:id
exports.updateQuiz = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { title, topic, description, questions } = req.body;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // Only allow the creator to update
    if (
      req.user.role !== "teacher" ||
      quiz.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Update fields
    quiz.title = title;
    quiz.topic = topic;
    quiz.description = description || "";
    quiz.questions = questions;

    await quiz.save();

    res
      .status(200)
      .json({ success: true, message: "Quiz updated successfully" });
  } catch (err) {
    console.error("❌ Error updating quiz:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyStudents = async (req, res, next) => {
  try {
    if (req.user.role !== "teacher") {
      return next(new ErrorHandler("Access denied", 403));
    }

    const quizzes = await Quiz.find({ createdBy: req.user._id });
    const studentStats = new Map();

    quizzes.forEach((quiz) => {
      quiz.submissions.forEach((submission) => {
        const sid = submission.studentId.toString();
        const questionCount = quiz.questions.length;

        if (!studentStats.has(sid)) {
          studentStats.set(sid, {
            quizzesTaken: 0,
            totalScore: 0,
            totalQuestions: 0,
            lastActive: quiz.createdAt,
          });
        }

        const stat = studentStats.get(sid);
        stat.quizzesTaken += 1;
        stat.totalScore += submission.score;
        stat.totalQuestions += questionCount;
        if (quiz.createdAt > stat.lastActive) {
          stat.lastActive = quiz.createdAt;
        }
      });
    });

    const studentIds = [...studentStats.keys()];
    const users = await User.find({ _id: { $in: studentIds } }).select(
      "name email createdAt"
    );

    const students = users.map((user) => {
      const stat = studentStats.get(user._id.toString());
      const avgScore =
        stat.totalQuestions > 0
          ? Math.round((stat.totalScore / stat.totalQuestions) * 100)
          : 0;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        joinedDate: user.createdAt,
        quizzesTaken: stat.quizzesTaken,
        avgScore,
        lastActive: stat.lastActive,
        status:
          (new Date() - new Date(stat.lastActive)) / (1000 * 60 * 60 * 24) > 14
            ? "inactive"
            : "active",
      };
    });

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("getMyStudents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// GET /api/quiz/students/performance
exports.getSubjectPerformance = async (req, res, next) => {
  try {
    if (req.user.role !== "teacher") {
      return next(new ErrorHandler("Access denied", 403));
    }

    const quizzes = await Quiz.find({ createdBy: req.user._id });

    const subjectMap = {};

    quizzes.forEach((quiz) => {
      const subject = quiz.topic;

      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          totalScore: 0,
          totalQuizzesTaken: 0,
          highestScore: 0,
        };
      }

      quiz.submissions.forEach((submission) => {
        const possibleScore = quiz.questions.length;
        const percentageScore = Math.round(
          (submission.score / possibleScore) * 100
        );

        subjectMap[subject].totalScore += percentageScore;
        subjectMap[subject].totalQuizzesTaken += 1;

        if (percentageScore > subjectMap[subject].highestScore) {
          subjectMap[subject].highestScore = percentageScore;
        }
      });
    });

    const result = Object.entries(subjectMap).map(([subject, stats]) => {
      return {
        subject,
        avgScore:
          stats.totalQuizzesTaken > 0
            ? Math.round(stats.totalScore / stats.totalQuizzesTaken)
            : 0,
        quizzesTaken: stats.totalQuizzesTaken,
        highestScore: stats.highestScore,
      };
    });

    res.status(200).json({
      success: true,
      performance: result,
    });
  } catch (error) {
    console.error("getSubjectPerformance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStudentPerformance = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const quizzes = await Quiz.find({ "submissions.studentId": studentId });

    const subjectMap = {};

    quizzes.forEach((quiz) => {
      const sub = quiz.submissions.find(
        (s) => s.studentId.toString() === studentId
      );
      if (!sub) return;

      const scorePercent = Math.round(
        (sub.score / quiz.questions.length) * 100
      );

      if (!subjectMap[quiz.topic]) {
        subjectMap[quiz.topic] = {
          total: 0,
          count: 0,
          highest: scorePercent,
        };
      }

      subjectMap[quiz.topic].total += scorePercent;
      subjectMap[quiz.topic].count += 1;
      subjectMap[quiz.topic].highest = Math.max(
        subjectMap[quiz.topic].highest,
        scorePercent
      );
    });

    const performance = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      avgScore: Math.round(data.total / data.count),
      quizzesTaken: data.count,
      highestScore: data.highest,
    }));

    res.status(200).json({ success: true, performance });
  } catch (err) {
    console.error("getStudentPerformance error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStudentActivityLog = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    const quizzes = await Quiz.find({ createdBy: teacherId });

    const logs = [];

    quizzes.forEach((quiz) => {
      quiz.submissions.forEach((submission) => {
        logs.push({
          studentId: submission.studentId,
          quizName: quiz.title,
          score:
            submission.score > 0
              ? Math.round((submission.score / quiz.questions.length) * 100)
              : null,
          date: quiz.createdAt,
          action: submission.score === 0 ? "Started quiz" : "Completed quiz",
        });
      });
    });

    const studentIds = [...new Set(logs.map((log) => log.studentId))];
    const studentDocs = await User.find({ _id: { $in: studentIds } }).select(
      "name"
    );

    const activities = logs.map((log, index) => {
      const student = studentDocs.find(
        (s) => s._id.toString() === log.studentId.toString()
      );
      return {
        id: String(index + 1),
        studentName: student?.name || "Unknown",
        action: log.action,
        quizName: log.quizName,
        score: log.score,
        date: log.date,
      };
    });

    // Sort by most recent
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res
      .status(200)
      .json({ success: true, activities: activities.slice(0, 10) });
  } catch (err) {
    console.error("getStudentActivityLog error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Fetch all quizzes by this teacher
    const quizzes = await Quiz.find({ createdBy: teacherId }).select(
      "submissions questions title createdAt"
    );

    // Collect student data across all quizzes
    const studentMap = {};

    quizzes.forEach((quiz) => {
      const questionCount = quiz.questions.length;
      quiz.submissions.forEach((submission) => {
        const studentId = submission.studentId.toString();
        const score =
          questionCount > 0
            ? Math.round((submission.score / questionCount) * 100)
            : 0;
        const submittedAt = quiz.createdAt;

        if (!studentMap[studentId]) {
          studentMap[studentId] = {
            quizzesTaken: 0,
            scores: [],
            lastActivity: submittedAt,
          };
        }

        studentMap[studentId].quizzesTaken += 1;
        studentMap[studentId].scores.push(score);
        if (submittedAt > studentMap[studentId].lastActivity) {
          studentMap[studentId].lastActivity = submittedAt;
        }
      });
    });

    // Fetch student names
    const studentIds = Object.keys(studentMap);
    const studentDocs = await User.find({ _id: { $in: studentIds } }).select(
      "name"
    );

    const students = studentIds.map((studentId) => {
      const info = studentMap[studentId];
      const scores = info.scores;
      const studentDoc = studentDocs.find(
        (s) => s._id.toString() === studentId
      );
      return {
        studentId,
        name: studentDoc?.name || "Unknown",
        quizzesTaken: info.quizzesTaken,
        averageScore: Math.round(
          scores.reduce((a, b) => a + b, 0) / scores.length
        ),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        lastActivity: info.lastActivity,
      };
    });

    res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    console.error("Failed to fetch student progress:", error);
    res.status(500).json({ message: "Failed to fetch student progress" });
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
