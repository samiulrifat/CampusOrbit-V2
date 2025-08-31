const express = require('express');
const router = express.Router();
const mainEventController = require('../controllers/mainEventController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


router.post('/', authMiddleware, mainEventController.createEvent);

router.put('/:eventId', authMiddleware, mainEventController.editEvent);

router.delete('/:eventId', authMiddleware, mainEventController.deleteEvent);

router.get('/', mainEventController.getAllEvents);

router.get('/my-club-events', authMiddleware, mainEventController.getEventsOfJoinedClubs);
router.get('/mine', authMiddleware, mainEventController.getMyEvents);

router.get('/:eventId', mainEventController.getEventDetails);

router.post('/:eventId/rsvp', authMiddleware, mainEventController.rsvpEvent);

router.get('/:eventId/attendees', authMiddleware, mainEventController.getAttendees);

router.post('/:eventId/gallery', authMiddleware, upload.single('file'), mainEventController.uploadPhoto);

router.delete('/:eventId/gallery/:photoId', authMiddleware, mainEventController.deletePhoto);

router.get('/:eventId/gallery', mainEventController.getGallery);

module.exports = router;
