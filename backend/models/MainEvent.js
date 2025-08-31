const mongoose = require('mongoose');

const MainEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  gallery: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      photoUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('MainEvent', MainEventSchema);
