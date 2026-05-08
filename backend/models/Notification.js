const mongoose = require('mongoose');
const { decryptText, encryptText, buildEncryptedDataMac, verifyEncryptedDataMac } = require('../utils/keymanager');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, set: encryptText, get: decryptText }, 
  message: { type: String, required: true, set: encryptText, get: decryptText },
  link: { type: String, set: encryptText, get: decryptText }, 
  relatedClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  relatedEvent: { type: mongoose.Schema.Types.ObjectId },
  relatedTask: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  integrityMac: { type: String, default: '' }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

notificationSchema.methods.getMacParts = function getMacParts() {
  return [
    this.user?.toString() || '',
    this.get('type', null, { getters: false }) || '',
    this.get('message', null, { getters: false }) || '',
    this.get('link', null, { getters: false }) || '',
    this.relatedClub?.toString() || '',
    this.relatedEvent?.toString() || '',
    this.relatedTask?.toString() || '',
    this.read ? '1' : '0'
  ];
};

notificationSchema.methods.hasValidMac = function hasValidMac() {
  return verifyEncryptedDataMac(this.getMacParts(), this.integrityMac);
};

notificationSchema.pre('save', function preSave(next) {
  this.integrityMac = buildEncryptedDataMac(this.getMacParts());
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
