const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const keyController = require('../controllers/keyController');

router.get('/public', authMiddleware, keyController.getActivePublicKeys);
router.get('/', authMiddleware, requireRole(['club_admin']), keyController.listKeyVersions);
router.post('/rotate', authMiddleware, requireRole(['club_admin']), keyController.rotateKeys);

module.exports = router;