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
    if (events.find(entry => !entry.hasValidMac())) {
      return res.status(400).json({ success: false, message: 'Event integrity check failed' });
    }
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

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, clubId } = req.body;
    const userId = req.user.id;
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

    const Notification = require('../models/Notification');
    for (const attendeeId of event.attendees) {
      await Notification.create({
        user: attendeeId,
        type: 'event-edited',
        message: `Event "${event.title}" has been updated. Check details for changes.`,
        relatedEvent: event._id
      });
    }
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

exports.getAllEvents = async (req, res) => {
  try {
    const events = await MainEvent.find().populate('club', 'name').populate('createdBy', 'name');
    if (events.find(entry => !entry.hasValidMac())) {
      return res.status(400).json({ success: false, message: 'Event integrity check failed' });
    }
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await MainEvent.find({ createdBy: userId }).populate('club', 'name');
    if (events.find(entry => !entry.hasValidMac())) {
      return res.status(400).json({ success: false, message: 'Event integrity check failed' });
    }
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

exports.getEventDetails = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await MainEvent.findById(eventId).populate('club', 'name').populate('createdBy', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!event.hasValidMac()) {
      return res.status(400).json({ success: false, message: 'Event integrity check failed' });
    }
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch event', error: err.message });
  }
};

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
    const Notification = require('../models/Notification');
    const notifyUsers = new Set(event.attendees.map(id => id.toString()));
    notifyUsers.add(event.createdBy.toString());
    for (const notifyId of notifyUsers) {
      await Notification.create({
        user: notifyId,
        type: 'gallery-photo',
        message: `A new photo was uploaded to the gallery for event "${event.name}"`,
        relatedEvent: event._id
      });
    }
    await event.save();
    res.status(201).json({ success: true, photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload photo', error: err.message });
  }
};

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
