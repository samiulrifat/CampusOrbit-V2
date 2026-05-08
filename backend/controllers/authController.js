const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { simpleHash } = require('../utils/hmac');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getSessionBinding(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  return simpleHash(`${userAgent}|${acceptLanguage}`);
}

function buildToken(user, req) {
  return jwt.sign(
    {
      id: user._id,
      userType: user.userType,
      tokenVersion: user.tokenVersion || 0,
      sessionBinding: getSessionBinding(req)
    },
    process.env.JWT_SECRET || 'devsecret',
    { expiresIn: '1d' }
  );
}

function buildSafeUser(user) {
  const safeUser = user.toSafeObject ? user.toSafeObject() : user.toObject();
  delete safeUser.password;
  return safeUser;
}

exports.register = async (req, res) => {
  const { name, email, contactInfo = '', password, securityQuestion, securityAnswer, userType } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({ success: false, message: 'Security question and answer are required for 2-step auth' });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(securityAnswer, 10);
    const user = new User({
      name,
      email: normalizedEmail,
      contactInfo,
      password: hashedPassword,
      securityQuestion,
      securityAnswerHash,
      userType
    });
    await user.save();

    const token = buildToken(user, req);
    res.json({ success: true, token, userType: user.userType, user: buildSafeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, securityAnswer, userType } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (userType && user.userType !== userType) {
      return res.status(400).json({ success: false, message: 'Selected account type does not match this email' });
    }

    if (!user.hasValidMac()) {
      return res.status(400).json({ success: false, message: 'User record integrity check failed' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isSecondFactorValid = await bcrypt.compare(securityAnswer || '', user.securityAnswerHash);
    if (!isSecondFactorValid) {
      return res.status(400).json({ success: false, message: 'Invalid second factor' });
    }

    const token = buildToken(user, req);
    res.json({ success: true, token, userType: user.userType, user: buildSafeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

exports.getSecondFactorQuestion = async (req, res) => {
  const { email } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.hasValidMac()) {
      return res.status(400).json({ success: false, message: 'User record integrity check failed' });
    }

    res.json({ success: true, securityQuestion: user.securityQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch second-factor question', error: error.message });
  }
};
