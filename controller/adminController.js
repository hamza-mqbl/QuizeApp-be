const Quiz = require("../models/Quiz");
const User = require("../models/student");
const ErrorHandler = require("../utils/ErrorHandler");

exports.getAllQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch quizzes", 500));
  }
};

exports.getAdminDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const users = await User.find();
    const quizzes = await Quiz.find().populate("createdBy", "name email");

    const totalUsers = users.length;
    const totalTeachers = users.filter((u) => u.role === "teacher").length;
    const totalStudents = users.filter((u) => u.role === "student").length;
    const totalAdmins = users.filter((u) => u.role === "admin").length;
    const totalQuizzes = quizzes.length;
    const publishedQuizzes = quizzes.filter((q) => q.isPublished).length;

    // Recent data for trends
    const recentUsers = users.filter((u) => u.createdAt >= sevenDaysAgo);
    const recentQuizzes = quizzes.filter((q) => q.createdAt >= sevenDaysAgo);
    const allSubmissions = quizzes.flatMap((q) => q.submissions || []);
    const recentSubmissions = recentQuizzes.flatMap((q) => q.submissions || []);

    const activeStudents = [
      ...new Set(allSubmissions.map((s) => s.studentId.toString())),
    ];
    const recentActiveStudents = [
      ...new Set(recentSubmissions.map((s) => s.studentId.toString())),
    ];

    // Calculate average scores
    const getAverageScore = (subs, quizSet) => {
      if (!subs.length || !quizSet.length) return 0;
      const totalScore = subs.reduce((sum, s) => sum + (s.score || 0), 0);
      const totalQuestions = quizSet.reduce(
        (sum, q) =>
          sum + (q.questions?.length || 0) * (q.submissions?.length || 0),
        0
      );
      return totalQuestions > 0
        ? Math.round((totalScore / totalQuestions) * 100)
        : 0;
    };

    const averageScore = getAverageScore(allSubmissions, quizzes);
    const recentAverageScore = getAverageScore(
      recentSubmissions,
      recentQuizzes
    );

    // Top performers
    const topPerformersRaw = {};
    quizzes.forEach((quiz) => {
      if (quiz.submissions) {
        quiz.submissions.forEach((submission) => {
          const studentId = submission.studentId.toString();
          if (!topPerformersRaw[studentId]) {
            topPerformersRaw[studentId] = { totalScore: 0, attempts: 0 };
          }
          topPerformersRaw[studentId].totalScore += submission.score || 0;
          topPerformersRaw[studentId].attempts += quiz.questions?.length || 0;
        });
      }
    });

    const topPerformers = Object.entries(topPerformersRaw)
      .map(([studentId, data]) => ({
        studentId,
        avgScore:
          data.attempts > 0
            ? Math.round((data.totalScore / data.attempts) * 100)
            : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    const studentIds = topPerformers.map((s) => s.studentId);
    const studentDocs = await User.find({ _id: { $in: studentIds } }).select(
      "name"
    );

    const topPerformersFormatted = topPerformers.map((p) => {
      const match = studentDocs.find((s) => s._id.toString() === p.studentId);
      return {
        name: match?.name || "Unknown",
        avgScore: `${p.avgScore}%`,
      };
    });

    // Performance by topic
    const topicMap = {};
    quizzes.forEach((quiz) => {
      const topic = quiz.topic || "General";
      if (!topicMap[topic]) {
        topicMap[topic] = [];
      }
      if (quiz.submissions) {
        quiz.submissions.forEach((sub) => {
          const totalPossible = quiz.questions?.length || 1;
          const percentageScore = Math.round(
            ((sub.score || 0) / totalPossible) * 100
          );
          topicMap[topic].push(percentageScore);
        });
      }
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

    // UPDATED: Weekly activity data with submissions
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
      Sun: { quizzes: 0, submissions: 0 },
      Mon: { quizzes: 0, submissions: 0 },
      Tue: { quizzes: 0, submissions: 0 },
      Wed: { quizzes: 0, submissions: 0 },
      Thu: { quizzes: 0, submissions: 0 },
      Fri: { quizzes: 0, submissions: 0 },
      Sat: { quizzes: 0, submissions: 0 },
    };

    // Count quizzes created in the last 7 days
    quizzes.forEach((quiz) => {
      const quizDate = new Date(quiz.createdAt);
      if (quizDate >= sevenDaysAgo) {
        const quizDay = dayMap[quizDate.getDay()];
        activityMap[quizDay].quizzes += 1;
      }
    });

    // Count submissions by the day they were submitted
    quizzes.forEach((quiz) => {
      if (quiz.submissions) {
        quiz.submissions.forEach((submission) => {
          // Assuming submission has createdAt or submittedAt field
          const submissionDate = new Date(
            submission.createdAt || submission.submittedAt || quiz.createdAt
          );
          if (submissionDate >= sevenDaysAgo) {
            const submissionDay = dayMap[submissionDate.getDay()];
            activityMap[submissionDay].submissions += 1;
          }
        });
      }
    });

    const activityData = Object.entries(activityMap).map(
      ([day, { quizzes, submissions }]) => ({
        name: day,
        quizzes,
        submissions,
      })
    );

    // User distribution for pie chart (already correct)
    const userDistribution = [
      { name: "Students", value: totalStudents, color: "#8884d8" },
      { name: "Teachers", value: totalTeachers, color: "#82ca9d" },
      { name: "Admins", value: totalAdmins, color: "#ffc658" },
    ];

    // UPDATED: Monthly growth data - CUMULATIVE totals (not new registrations per month)
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Get cumulative users up to this month
      const cumulativeUsers = users.filter((u) => u.createdAt <= monthEnd);

      const monthName = monthEnd.toLocaleDateString("en-US", {
        month: "short",
      });

      monthlyGrowth.push({
        name: monthName,
        teachers: cumulativeUsers.filter((u) => u.role === "teacher").length,
        students: cumulativeUsers.filter((u) => u.role === "student").length,
      });
    }

    // Recent activities
    const recentActivities = [];

    // Add recent user registrations
    recentUsers.slice(0, 3).forEach((user) => {
      recentActivities.push({
        id: `user_${user._id}`,
        type: "user_registration",
        message: `New ${user.role} ${user.name} registered`,
        time: getTimeAgo(user.createdAt),
        icon: user.role === "teacher" ? "UserCog" : "Users",
        color: user.role === "teacher" ? "text-blue-500" : "text-purple-500",
      });
    });

    // Add recent quiz creations
    recentQuizzes.slice(0, 3).forEach((quiz) => {
      recentActivities.push({
        id: `quiz_${quiz._id}`,
        type: "quiz_created",
        message: `${quiz.createdBy?.name || "Someone"} created '${quiz.title}'`,
        time: getTimeAgo(quiz.createdAt),
        icon: "BookOpen",
        color: "text-green-500",
      });
    });

    // Sort by most recent
    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      success: true,
      stats: {
        // Basic counts
        totalUsers,
        totalTeachers,
        totalStudents,
        totalAdmins,
        totalQuizzes,
        publishedQuizzes,
        activeStudents: activeStudents.length,
        recentActiveStudents: recentActiveStudents.length,
        users,
        // Scores
        averageScore: `${averageScore}%`,
        recentAverageScore: `${recentAverageScore}%`,

        // Trends
        userGrowthThisMonth: recentUsers.length,
        quizGrowthThisWeek: recentQuizzes.length,

        // UPDATED: Chart data matching frontend requirements
        topPerformers: topPerformersFormatted,
        performanceData,
        activityData, // Now includes submissions
        userDistribution, // Already correct
        monthlyGrowth, // Now shows cumulative growth
        recentActivities: recentActivities.slice(0, 4),

        // Recent users for the users tab
        recentUsers: recentUsers.slice(0, 4).map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: "active", // You might want to add this field to your user model
          joinedAt: user.createdAt.toISOString().split("T")[0],
        })),

        // System metrics (you can make these dynamic based on your needs)
        systemMetrics: [
          {
            title: "System Uptime",
            value: "99.9%",
            description: "Last 30 days",
            status: "excellent",
          },
          {
            title: "Database Size",
            value: "2.3 GB",
            description: "Total storage used",
            status: "normal",
          },
          {
            title: "API Requests",
            value: "1.2M",
            description: "This month",
            status: "normal",
          },
          {
            title: "Error Rate",
            value: "0.1%",
            description: "Last 24 hours",
            status: "excellent",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return next(new ErrorHandler("Failed to fetch admin dashboard stats", 500));
  }
};

// Helper function for time ago (if not already defined)
function getTimeAgo(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}
// Delete User API
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return next(new ErrorHandler("Failed to delete user", 500));
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }
}

exports.getAllStudentsOptimized = async (req, res, next) => {
  try {
    const studentsWithStats = await Quiz.aggregate([
      // Unwind submissions to flatten
      { $unwind: "$submissions" },
      // Lookup student details
      {
        $lookup: {
          from: "users",
          localField: "submissions.studentId",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      // Only include students
      { $unwind: "$studentInfo" },
      { $match: { "studentInfo.role": "student" } },
      // Group by student
      {
        $group: {
          _id: "$submissions.studentId",
          name: { $first: "$studentInfo.name" },
          email: { $first: "$studentInfo.email" },
          createdAt: { $first: "$studentInfo.createdAt" },
          quizzesTaken: { $sum: 1 },
          totalPercentScore: {
            $sum: {
              $multiply: [
                { $divide: ["$submissions.score", { $size: "$questions" }] },
                100,
              ],
            },
          }, // Calculate total percentage score
          lastActivity: { $max: "$createdAt" },
        },
      },
      // Calculate average score
      {
        $addFields: {
          averageScore: {
            $cond: [
              { $gt: ["$quizzesTaken", 0] },
              {
                $round: [
                  { $divide: ["$totalPercentScore", "$quizzesTaken"] },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      // Final projection
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: 1,
          email: 1,
          quizzesTaken: 1,
          averageScore: 1,
          lastActivity: 1,
          joinedAt: "$createdAt",
        },
      },
      { $sort: { averageScore: -1, name: 1 } },
    ]);

    res.status(200).json({
      success: true,
      students: studentsWithStats,
      count: studentsWithStats.length,
    });
  } catch (error) {
    console.error("Error in getAllStudentsOptimized:", error);
    return next(new ErrorHandler("Failed to fetch students", 500));
  }
};

exports.getAllTeachers = async (req, res, next) => {
  try {
    // Fetch all users with the role of teacher
    const teachers = await User.aggregate([
      { $match: { role: "teacher" } },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "createdBy",
          as: "quizzesCreated",
        },
      },
      {
        $addFields: {
          totalQuizzesCreated: { $size: "$quizzesCreated" },
          lastActivity: { $max: "$quizzesCreated.createdAt" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          totalQuizzesCreated: 1,
          lastActivity: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      teachers: teachers,
      count: teachers.length,
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
exports.deleteTeacherAndQuizzes = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Delete all quizzes created by this teacher
    await Quiz.deleteMany({ createdBy: teacherId });

    // Delete the teacher
    await User.findByIdAndDelete(teacherId);

    return res
      .status(200)
      .json({ message: "Teacher and their quizzes deleted successfully!" });
  } catch (error) {
    console.error("Error deleting teacher and quizzes:", error);
    return res
      .status(500)
      .json({ error: "Error deleting teacher and quizzes" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete the teacher
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "user deleted  successfully!" });
  } catch (error) {
    console.error("Error deleting teacher and quizzes:", error);
    return res.status(500).json({ error: "Error deleting user" });
  }
};
