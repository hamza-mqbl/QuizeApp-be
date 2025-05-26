const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [
    {
      type: String,
      // required: true,
      default: "", // Default to empty string
      validate: {
        validator: (value) => typeof value === "string", // Allow empty strings
        message: "Answer must be a string",
      },
    },
  ],
  score: { type: Number, required: true },
  resultPublished: { type: Boolean, default: false },
  feedback: { type: String, default: null },
});
const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, required: true },
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: String, required: true },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  quizCode: { type: String, unique: true, required: true },
  submissions: [SubmissionSchema],
  isPublished: { type: Boolean, default: false }, // ✅ NEW FIELD
  resultsPublished: { type: Boolean, default: false }, // ✅ new field
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Quiz", QuizSchema);
