const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/invitations', authMiddleware, userController.getUserInvitations);
router.get('/joinedclubs', authMiddleware, userController.getJoinedClubs);
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);


module.exports = router;
