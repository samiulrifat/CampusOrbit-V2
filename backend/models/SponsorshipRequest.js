const mongoose = require('mongoose');
const { decryptText, encryptText, buildEncryptedDataMac, verifyEncryptedDataMac } = require('../utils/keymanager');

const SponsorshipRequestSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'MainEvent', required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true, set: encryptText, get: decryptText },
  amount: { type: Number, required: true },
  coverLetter: { type: String, required: true, set: encryptText, get: decryptText },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  integrityMac: { type: String, default: '' }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

SponsorshipRequestSchema.methods.getMacParts = function getMacParts() {
  return [
    this.event?.toString() || '',
    this.club?.toString() || '',
    this.member?.toString() || '',
    this.get('companyName', null, { getters: false }) || '',
    String(this.amount ?? ''),
    this.get('coverLetter', null, { getters: false }) || '',
    this.status || ''
  ];
};

SponsorshipRequestSchema.methods.hasValidMac = function hasValidMac() {
  return verifyEncryptedDataMac(this.getMacParts(), this.integrityMac);
};

SponsorshipRequestSchema.pre('save', function preSave(next) {
  this.integrityMac = buildEncryptedDataMac(this.getMacParts());
  next();
});

module.exports = mongoose.model('SponsorshipRequest', SponsorshipRequestSchema);
