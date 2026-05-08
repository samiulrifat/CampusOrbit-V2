const mongoose = require('mongoose');
const { decryptText, encryptText } = require('../utils/keymanager');
const { hmac } = require('../utils/hmac');

const TaskSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true, set: encryptText, get: decryptText },
  progress: { type: String, default: '', set: encryptText, get: decryptText },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  integrityMac: { type: String, default: '' }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

TaskSchema.methods.hasValidMac = function hasValidMac() {
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawProgress = this.get('progress', null, { getters: false }) || '';
  const expected = hmac(
    `${this.club?.toString() || ''}|${this.assignedTo?.toString() || ''}|${this.assignedBy?.toString() || ''}|${rawDescription}|${rawProgress}|${this.status || ''}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );

  if (!this.integrityMac) {
    this.integrityMac = expected;
    return true;
  }

  return this.integrityMac === expected;
};

TaskSchema.pre('save', function preSave(next) {
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawProgress = this.get('progress', null, { getters: false }) || '';

  this.integrityMac = hmac(
    `${this.club?.toString() || ''}|${this.assignedTo?.toString() || ''}|${this.assignedBy?.toString() || ''}|${rawDescription}|${rawProgress}|${this.status || ''}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
