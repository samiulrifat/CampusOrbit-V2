const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, 
  message: { type: String, required: true },
  link: { type: String }, 
  relatedClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  relatedEvent: { type: mongoose.Schema.Types.ObjectId },
  relatedTask: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);
