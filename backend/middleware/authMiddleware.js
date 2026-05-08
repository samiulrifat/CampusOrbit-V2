const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { simpleHash } = require('../utils/hmac');

function getSessionBinding(req) {
  const userAgent = req.get('user-agent') || '';
  const acceptLanguage = req.get('accept-language') || '';
  return simpleHash(`${userAgent}|${acceptLanguage}`);
}

module.exports = async function (req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Session expired, please login again' });
    }

    if (decoded.sessionBinding !== getSessionBinding(req)) {
      return res.status(401).json({ message: 'Session fingerprint mismatch' });
    }

    if (!user.hasValidMac()) {
      return res.status(401).json({ message: 'User integrity validation failed' });
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
