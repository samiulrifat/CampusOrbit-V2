const mongoose = require('mongoose');
const { decryptText, encryptText } = require('../utils/keymanager');
const { hmac } = require('../utils/hmac');

const MainEventSchema = new mongoose.Schema({
  title: { type: String, required: true, set: encryptText, get: decryptText },
  description: { type: String, set: encryptText, get: decryptText },
  date: { type: Date, required: true },
  location: { type: String, required: true, set: encryptText, get: decryptText },
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
  ],
  integrityMac: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

MainEventSchema.methods.hasValidMac = function hasValidMac() {
  const rawTitle = this.get('title', null, { getters: false }) || '';
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawLocation = this.get('location', null, { getters: false }) || '';
  const rawGallery = JSON.stringify(this.get('gallery', null, { getters: false }) || []);
  const rawAttendees = JSON.stringify(this.attendees || []);
  const expected = hmac(
    `${rawTitle}|${rawDescription}|${rawLocation}|${rawGallery}|${rawAttendees}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );

  if (!this.integrityMac) {
    this.integrityMac = expected;
    return true;
  }

  return this.integrityMac === expected;
};

MainEventSchema.pre('save', function preSave(next) {
  const rawTitle = this.get('title', null, { getters: false }) || '';
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawLocation = this.get('location', null, { getters: false }) || '';
  const rawGallery = JSON.stringify(this.get('gallery', null, { getters: false }) || []);
  const rawAttendees = JSON.stringify(this.attendees || []);

  this.integrityMac = hmac(
    `${rawTitle}|${rawDescription}|${rawLocation}|${rawGallery}|${rawAttendees}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );
  next();
});

module.exports = mongoose.model('MainEvent', MainEventSchema);
