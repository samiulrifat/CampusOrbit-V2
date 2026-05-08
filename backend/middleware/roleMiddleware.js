module.exports = function requireRole(allowedRoles = []) {
  const roleList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function roleGuard(req, res, next) {
    if (!req.user || !req.user.userType) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!roleList.includes(req.user.userType)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }

    return next();
  };
};