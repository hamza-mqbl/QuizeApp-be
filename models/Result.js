const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  feedback: { type: String }, // AI-generated feedback
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Result', resultSchema);