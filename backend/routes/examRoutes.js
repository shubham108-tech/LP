const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { protect, authorize } = require('../middleware/authMiddleware');

// CRUD Exams (Teacher)
router.get('/', protect, examController.getExams); // Also for students (filtered)
router.post('/', protect, authorize(['admin', 'teacher']), examController.createExam);
router.delete('/:id', protect, authorize(['admin', 'teacher']), examController.deleteExam);

// Question Management
router.post('/questions', protect, authorize(['admin', 'teacher']), examController.addQuestion);
router.get('/questions/:id', protect, examController.getQuestions); // For Edit View or Start

// Exam Taking (Student)
router.post('/start/:id', protect, authorize(['student']), examController.startExam); // Get Qs without Ans
router.post('/submit', protect, authorize(['student']), examController.submitExam);

// Results
router.get('/my-results', protect, authorize(['student']), examController.getMyResults);
router.get('/:id/results', protect, authorize(['admin', 'teacher']), examController.getExamResults);

module.exports = router;
