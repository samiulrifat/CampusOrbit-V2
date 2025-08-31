const mongoose = require('mongoose');

const SponsorshipRequestSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'MainEvent', required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true },
  amount: { type: Number, required: true },
  coverLetter: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SponsorshipRequest', SponsorshipRequestSchema);
