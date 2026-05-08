const mongoose = require('mongoose');
const { decryptText, encryptText } = require('../utils/keymanager');
const { hmac } = require('../utils/hmac');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, set: encryptText, get: decryptText },
  email: { type: String, required: true, unique: true, set: encryptText, get: decryptText },
  contactInfo: { type: String, default: '', set: encryptText, get: decryptText },
  password: { type: String, required: true },
  securityQuestion: { type: String, required: true, set: encryptText, get: decryptText },
  securityAnswerHash: { type: String, required: true },
  userType: { type: String, enum: ['student', 'club_admin'], required: true },
  tokenVersion: { type: Number, default: 0 },
  userDataMac: { type: String, default: '' },
  clubsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  clubsInvited: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  clubsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }]
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

UserSchema.methods.toSafeObject = function toSafeObject() {
  const profile = this.toObject();
  delete profile.password;
  delete profile.securityAnswerHash;
  delete profile.userDataMac;
  return profile;
};

UserSchema.methods.hasValidMac = function hasValidMac() {
  const rawName = this.get('name', null, { getters: false }) || '';
  const rawEmail = this.get('email', null, { getters: false }) || '';
  const rawContactInfo = this.get('contactInfo', null, { getters: false }) || '';
  const rawQuestion = this.get('securityQuestion', null, { getters: false }) || '';
  const expected = hmac(
    `${rawName}|${rawEmail}|${rawContactInfo}|${rawQuestion}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );

  if (!this.userDataMac) {
    this.userDataMac = expected;
    return true;
  }

  return this.userDataMac === expected;
};

UserSchema.pre('save', function preSave(next) {
  const rawName = this.get('name', null, { getters: false }) || '';
  const rawEmail = this.get('email', null, { getters: false }) || '';
  const rawContactInfo = this.get('contactInfo', null, { getters: false }) || '';
  const rawQuestion = this.get('securityQuestion', null, { getters: false }) || '';

  this.userDataMac = hmac(
    `${rawName}|${rawEmail}|${rawContactInfo}|${rawQuestion}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );
  next();
});

module.exports = mongoose.model('User', UserSchema);
