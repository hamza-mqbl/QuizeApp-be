const express = require('express');
const router = express.Router();
const resultController = require('../controller/resultController');

// Submit quiz result
router.post('/submit', resultController.submitResult);

// Get result by student
router.get('/:studentId', resultController.getResultByStudent);

module.exports = router;