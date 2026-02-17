const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, scheduleController.getSchedules);
router.post('/', protect, authorize(['admin', 'teacher']), scheduleController.createSchedule);
router.delete('/:id', protect, authorize(['admin', 'teacher']), scheduleController.deleteSchedule);

module.exports = router;
