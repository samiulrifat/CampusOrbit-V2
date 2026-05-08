const mongoose = require('mongoose');
const { decryptText, encryptText } = require('../utils/keymanager');
const { hmac } = require('../utils/hmac');

const ClubSchema = new mongoose.Schema({
  name: { type: String, required: true, set: encryptText, get: decryptText },
  description: { type: String, set: encryptText, get: decryptText },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  officers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  invitations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  announcements: [
    {
      title: { type: String, required: true, set: encryptText, get: decryptText },
      content: { type: String, required: true, set: encryptText, get: decryptText },
      date: { type: Date, default: Date.now },
    },
  ],

  activityLog: [
    {
      description: { type: String, required: true, set: encryptText, get: decryptText },
      photos: [String], // array of image URLs or paths
      date: { type: Date, default: Date.now },
    },
  ],

  meetings: [
    {
      title: { type: String, required: true, set: encryptText, get: decryptText },
      description: { type: String, set: encryptText, get: decryptText },
      date: { type: Date, required: true },
      invitedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      attendance: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          status: { type: String, enum: ['present', 'absent'], default: 'absent' },
        }
      ],
      createdAt: { type: Date, default: Date.now }
    }
  ],

  polls: [
    {
      question: { type: String, required: true, set: encryptText, get: decryptText },
      options: [
        {
          text: { type: String, required: true, set: encryptText, get: decryptText },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }
      ],
      createdAt: { type: Date, default: Date.now },
    }
  ],

  resources: [
    {
      uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type: { type: String, enum: ['file', 'link'], required: true },
      fileUrl: String, // URL or path for files
      linkUrl: String, // URL if type is 'link'
      title: { type: String, set: encryptText, get: decryptText },
      uploadedAt: { type: Date, default: Date.now },
    }
  ],

  events: [
    {
      name: { type: String, required: true, set: encryptText, get: decryptText },
      description: { type: String, set: encryptText, get: decryptText },
      volunteers: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          signedUpAt: { type: Date, default: Date.now },
        },
      ],
      createdAt: { type: Date, default: Date.now },
    }
  ],

  achievements: [
    {
      title: { type: String, required: true, set: encryptText, get: decryptText },
      badgeUrl: String, // URL or filename of badge image/icon
      description: { type: String, set: encryptText, get: decryptText },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  awardedAchievements: [
    {
      achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
      member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      awardedAt: { type: Date, default: Date.now }
    }
  ],

  feedbacks: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // student who submits
      message: { type: String, required: true, set: encryptText, get: decryptText },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  contactDirectory: [
    {
      name: { type: String, required: true, set: encryptText, get: decryptText },
      roleInClub: { type: String, required: true, set: encryptText, get: decryptText }, // role as set by club admin
      contactEmail: { type: String, required: true, set: encryptText, get: decryptText },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  integrityMac: { type: String, default: '' }


}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

ClubSchema.methods.hasValidMac = function hasValidMac() {
  const rawName = this.get('name', null, { getters: false }) || '';
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawAnnouncements = JSON.stringify(this.get('announcements', null, { getters: false }) || []);
  const rawActivity = JSON.stringify(this.get('activityLog', null, { getters: false }) || []);
  const rawMeetings = JSON.stringify(this.get('meetings', null, { getters: false }) || []);
  const rawPolls = JSON.stringify(this.get('polls', null, { getters: false }) || []);
  const rawResources = JSON.stringify(this.get('resources', null, { getters: false }) || []);
  const rawEvents = JSON.stringify(this.get('events', null, { getters: false }) || []);
  const rawAchievements = JSON.stringify(this.get('achievements', null, { getters: false }) || []);
  const rawFeedbacks = JSON.stringify(this.get('feedbacks', null, { getters: false }) || []);
  const rawContacts = JSON.stringify(this.get('contactDirectory', null, { getters: false }) || []);

  const expected = hmac(
    `${rawName}|${rawDescription}|${rawAnnouncements}|${rawActivity}|${rawMeetings}|${rawPolls}|${rawResources}|${rawEvents}|${rawAchievements}|${rawFeedbacks}|${rawContacts}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );

  if (!this.integrityMac) {
    this.integrityMac = expected;
    return true;
  }

  return this.integrityMac === expected;
};

ClubSchema.pre('save', function preSave(next) {
  const rawName = this.get('name', null, { getters: false }) || '';
  const rawDescription = this.get('description', null, { getters: false }) || '';
  const rawAnnouncements = JSON.stringify(this.get('announcements', null, { getters: false }) || []);
  const rawActivity = JSON.stringify(this.get('activityLog', null, { getters: false }) || []);
  const rawMeetings = JSON.stringify(this.get('meetings', null, { getters: false }) || []);
  const rawPolls = JSON.stringify(this.get('polls', null, { getters: false }) || []);
  const rawResources = JSON.stringify(this.get('resources', null, { getters: false }) || []);
  const rawEvents = JSON.stringify(this.get('events', null, { getters: false }) || []);
  const rawAchievements = JSON.stringify(this.get('achievements', null, { getters: false }) || []);
  const rawFeedbacks = JSON.stringify(this.get('feedbacks', null, { getters: false }) || []);
  const rawContacts = JSON.stringify(this.get('contactDirectory', null, { getters: false }) || []);

  this.integrityMac = hmac(
    `${rawName}|${rawDescription}|${rawAnnouncements}|${rawActivity}|${rawMeetings}|${rawPolls}|${rawResources}|${rawEvents}|${rawAchievements}|${rawFeedbacks}|${rawContacts}`,
    process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key'
  );
  next();
});


module.exports = mongoose.model('Club', ClubSchema);
