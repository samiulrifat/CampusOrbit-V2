// Get events hosted by clubs the user has joined
exports.getEventsOfJoinedClubs = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    console.log('User:', user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const clubIds = user.clubsJoined || [];
    console.log('Club IDs:', clubIds);
    if (!clubIds.length) return res.json({ success: true, events: [] });
    const query = { club: { $in: clubIds } };
    console.log('Event Query:', query);
    const events = await MainEvent.find(query)
      .populate('club', 'name')
      .populate('createdBy', 'name');
    console.log('Events found:', events);
    res.json({ success: true, events });
  } catch (err) {
    console.error('Error in getEventsOfJoinedClubs:', err);
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};
const MainEvent = require('../models/MainEvent');
const Club = require('../models/Club');
const User = require('../models/User');

// Create main event (club admin only)
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, clubId } = req.body;
    const userId = req.user.id;
    // Check club admin
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!club.officers.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    const event = new MainEvent({ title, description, date, location, club: clubId, createdBy: userId });
    await event.save();
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event', error: err.message });
  }
};

// Edit main event (club admin only)
exports.editEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const updates = req.body;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = await Club.findById(event.club);
    if (!club || !club.officers.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    Object.assign(event, updates);
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to edit event', error: err.message });
  }
};

// Delete main event (club admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = await Club.findById(event.club);
    if (!club || !club.officers.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    await event.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event', error: err.message });
  }
};

// Get all main events (public)
exports.getAllEvents = async (req, res) => {
  try {
    const events = await MainEvent.find().populate('club', 'name').populate('createdBy', 'name');
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

// Get main events by club admin
exports.getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await MainEvent.find({ createdBy: userId }).populate('club', 'name');
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

// Get single event details (public)
exports.getEventDetails = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await MainEvent.findById(eventId).populate('club', 'name').populate('createdBy', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch event', error: err.message });
  }
};

// RSVP to event (any user)
exports.rsvpEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.attendees.includes(userId)) return res.status(400).json({ message: 'Already RSVP’d' });
    event.attendees.push(userId);
    await event.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to RSVP', error: err.message });
  }
};

// Get attendee list (club admin only)
exports.getAttendees = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId).populate('attendees', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = await Club.findById(event.club);
    if (!club || !club.officers.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    res.json({ success: true, attendees: event.attendees });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendees', error: err.message });
  }
};

// Upload photo to gallery (attendee only)
exports.uploadPhoto = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!event.attendees.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    event.gallery.push({ uploader: userId, photoUrl });
    await event.save();
    res.status(201).json({ success: true, photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload photo', error: err.message });
  }
};

// Get gallery photos (public)
exports.getGallery = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ success: true, gallery: event.gallery });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch gallery', error: err.message });
  }
};

// Delete photo from gallery (club admin only)
exports.deletePhoto = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const photoId = req.params.photoId;
    const userId = req.user.id;
    const event = await MainEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = await Club.findById(event.club);
    if (!club || !club.officers.includes(userId)) return res.status(403).json({ message: 'Not authorized' });
    console.log('Gallery before:', event.gallery);
    const initialLength = event.gallery.length;
    event.gallery = event.gallery.filter(photo => {
      // Match by _id if present, else fallback to photoUrl
      if (photo._id) {
        return photo._id.toString() !== photoId;
      } else if (photo.photoUrl === photoId) {
        return false;
      }
      return true;
    });
    console.log('Gallery after:', event.gallery);
    if (event.gallery.length === initialLength) return res.status(404).json({ message: 'Photo not found' });
    await event.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete photo', error: err.message });
  }
};
