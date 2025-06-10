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
      default: "", // Default to empty string
      validate: {
        validator: (value) => typeof value === "string",
        message: "Answer must be a string",
      },
    },
  ],
  score: { type: Number, required: true },
  resultPublished: { type: Boolean, default: false },
  feedback: { type: String, default: null },
  // ✅ Add submission location for verification
  submissionLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, required: true },
  description: { type: String, default: "" },

  // ✅ NEW: Dynamic time limit in minutes
  timeLimit: {
    type: Number,
    required: true,
    default: 30, // Default 30 minutes
    min: [1, "Time limit must be at least 1 minute"],
    max: [300, "Time limit cannot exceed 300 minutes (5 hours)"],
  },

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
  isSubmit: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  resultsPublished: { type: Boolean, default: false },

  // ✅ Location restriction fields
  enableLocationRestriction: { type: Boolean, default: false },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number }, // in meters
    address: { type: String },
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Quiz", QuizSchema);

// const mongoose = require("mongoose");

// const SubmissionSchema = new mongoose.Schema({
//   studentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   answers: [
//     {
//       type: String,
//       // required: true,
//       default: "", // Default to empty string
//       validate: {
//         validator: (value) => typeof value === "string",
//         message: "Answer must be a string",
//       },
//     },
//   ],
//   score: { type: Number, required: true },
//   resultPublished: { type: Boolean, default: false },
//   feedback: { type: String, default: null },
//   // ✅ NEW: Add submission location for verification
//   submissionLocation: {
//     latitude: { type: Number },
//     longitude: { type: Number },
//     timestamp: { type: Date, default: Date.now },
//   },
// });

// const QuizSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   topic: { type: String, required: true },
//   description: { type: String, default: "" }, // ✅ NEW FIELD
//   questions: [
//     {
//       questionText: { type: String, required: true },
//       options: [{ type: String, required: true }],
//       correctAnswer: { type: String, required: true },
//     },
//   ],
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   quizCode: { type: String, unique: true, required: true },
//   submissions: [SubmissionSchema],
//   isSubmit: { type: Boolean, default: false }, // ✅ existing field
//   isPublished: { type: Boolean, default: false }, // ✅ existing field
//   resultsPublished: { type: Boolean, default: false }, // ✅ existing field

//   // ✅ NEW LOCATION FIELDS
//   enableLocationRestriction: { type: Boolean, default: false },
//   location: {
//     latitude: { type: Number },
//     longitude: { type: Number },
//     radius: { type: Number }, // in meters
//     address: { type: String },
//   },

//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("Quiz", QuizSchema);

// // const mongoose = require("mongoose");

// // const SubmissionSchema = new mongoose.Schema({
// //   studentId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "User",
// //     required: true,
// //   },
// //   answers: [
// //     {
// //       type: String,
// //       // required: true,
// //       default: "", // Default to empty string
// //       validate: {
// //         validator: (value) => typeof value === "string",
// //         message: "Answer must be a string",
// //       },
// //     },
// //   ],
// //   score: { type: Number, required: true },
// //   resultPublished: { type: Boolean, default: false },
// //   feedback: { type: String, default: null },
// // });
// // const QuizSchema = new mongoose.Schema({
// //   title: { type: String, required: true },
// //   topic: { type: String, required: true },
// //   questions: [
// //     {
// //       questionText: { type: String, required: true },
// //       options: [{ type: String, required: true }],
// //       correctAnswer: { type: String, required: true },
// //     },
// //   ],
// //   createdBy: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "User",
// //     required: true,
// //   },
// //   quizCode: { type: String, unique: true, required: true },
// //   submissions: [SubmissionSchema],
// //   isSubmit: { type: Boolean, default: false }, // ✅ NEW FIELD
// //   isPublished: { type: Boolean, default: false }, // ✅ NEW FIELD
// //   resultsPublished: { type: Boolean, default: false }, // ✅ new field
// //   createdAt: { type: Date, default: Date.now },
// // });

// // module.exports = mongoose.model("Quiz", QuizSchema);
