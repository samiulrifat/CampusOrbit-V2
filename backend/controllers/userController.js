const User = require('../models/User');
const Club = require('../models/Club');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.hasValidMac()) return res.status(400).json({ success: false, message: 'User integrity check failed' });

    res.json({ success: true, profile: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, contactInfo, securityQuestion, securityAnswer } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (contactInfo !== undefined) user.contactInfo = contactInfo;
    if (securityQuestion !== undefined) user.securityQuestion = securityQuestion;

    if (securityAnswer !== undefined && securityAnswer !== '') {
      const bcrypt = require('bcrypt');
      user.securityAnswerHash = await bcrypt.hash(securityAnswer, 10);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();
    res.json({ success: true, profile: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
};

exports.getUserInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const invitations = await Club.find({ _id: { $in: user.clubsInvited } }).select('name description');

    res.json({ success: true, invitations });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invitations', error: error.message });
  }
};

exports.getJoinedClubs = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const clubs = await Club.find({ _id: { $in: user.clubsJoined } }).select('name description');

    res.json({ success: true, clubs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch joined clubs', error: error.message });
  }
};

