const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// Club admin: assign task to member
router.post('/assign/:clubId', authMiddleware, taskController.assignTask);
// Club admin: view all tasks for club
router.get('/club/:clubId', authMiddleware, taskController.getClubTasks);
// Club admin: mark task complete
router.put('/complete/:taskId', authMiddleware, taskController.markTaskComplete);
// Member: view assigned tasks
router.get('/my-tasks', authMiddleware, taskController.getMyTasks);
// Member: update progress
router.put('/progress/:taskId', authMiddleware, taskController.updateProgress);

module.exports = router;
