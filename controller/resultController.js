const Result = require('../models/Result');
const { generateFeedback } = require('../services/feedbackService');

exports.submitResult = async (req, res) => {
  try {
    const { quizId, studentId, score } = req.body;
    const feedback = await generateFeedback(quizId, studentId); // Integrate Hugging Face here
    const result = new Result({ quiz: quizId, student: studentId, score, feedback });
    await result.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting result' });
  }
};

exports.getResultByStudent = async (req, res) => {
  try {
    const results = await Result.find({ student: req.params.studentId }).populate('quiz');
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results' });
  }
};