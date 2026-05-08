const mongoose = require('mongoose');
const { buildEncryptedDataMac, verifyEncryptedDataMac } = require('../utils/keymanager');

const CryptoKeySchema = new mongoose.Schema({
  version: { type: Number, required: true, unique: true },
  status: { type: String, enum: ['active', 'retired'], default: 'active' },
  rsaPublicE: { type: String, required: true },
  rsaPublicN: { type: String, required: true },
  eccPublicX: { type: String, required: true },
  eccPublicY: { type: String, required: true },
  rsaPrivateCipher: { type: String, required: true },
  eccPrivateCipher: { type: String, required: true },
  integrityMac: { type: String, default: '' },
  rotatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rotatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

CryptoKeySchema.methods.getMacParts = function getMacParts() {
  return [
    this.version,
    this.status,
    this.rsaPublicE,
    this.rsaPublicN,
    this.eccPublicX,
    this.eccPublicY,
    this.rsaPrivateCipher,
    this.eccPrivateCipher
  ];
};

CryptoKeySchema.methods.hasValidMac = function hasValidMac() {
  return verifyEncryptedDataMac(this.getMacParts(), this.integrityMac);
};

CryptoKeySchema.pre('save', function preSave(next) {
  this.integrityMac = buildEncryptedDataMac(this.getMacParts());
  next();
});

module.exports = mongoose.model('CryptoKey', CryptoKeySchema);