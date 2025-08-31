const express = require('express');
const router = express.Router();
const sponsorshipController = require('../controllers/sponsorshipController');
const authMiddleware = require('../middleware/authMiddleware');

// Submit sponsorship request (club member only)
router.post('/:eventId', authMiddleware, sponsorshipController.submitRequest);

// Get sponsorship requests for an event (club admin only)
router.get('/event/:eventId', authMiddleware, sponsorshipController.getRequestsForEvent);

// Approve or reject sponsorship request (club admin only)
router.put('/:requestId/status', authMiddleware, sponsorshipController.updateRequestStatus);

// Get sponsorship requests submitted by the logged-in user
router.get('/my-requests', authMiddleware, sponsorshipController.getMyRequests);

module.exports = router;
