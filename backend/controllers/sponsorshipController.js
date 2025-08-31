const SponsorshipRequest = require('../models/SponsorshipRequest');
const MainEvent = require('../models/MainEvent');
const Club = require('../models/Club');

// Submit sponsorship request (club member only)
exports.submitRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { companyName, amount, coverLetter } = req.body;
    const event = await MainEvent.findById(eventId).populate('club');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = event.club;
    if (!club.members.map(m => m.toString()).includes(userId)) {
      return res.status(403).json({ message: 'You are not a member of the club hosting this event.' });
    }
    const request = new SponsorshipRequest({
      event: eventId,
      club: club._id,
      member: userId,
      companyName,
      amount,
      coverLetter
    });
    await request.save();
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit request', error: err.message });
  }
};

// Get sponsorship requests for an event (club admin only)
exports.getRequestsForEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const event = await MainEvent.findById(eventId).populate('club');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const club = event.club;
    if (!club.officers.map(o => o.toString()).includes(userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const requests = await SponsorshipRequest.find({ event: eventId })
      .populate('member', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch requests', error: err.message });
  }
};

// Approve or reject sponsorship request (club admin only)
exports.updateRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const request = await SponsorshipRequest.findById(requestId).populate('event');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const event = await MainEvent.findById(request.event._id).populate('club');
    const club = event.club;
    if (!club.officers.map(o => o.toString()).includes(userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    request.status = status;
    await request.save();
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update request', error: err.message });
  }
};
