'use strict';

/**
 * Role guard — call after authenticate().
 * Usage: router.get('/admin-only', authenticate, requireRole('admin'), handler)
 *        router.get('/drivers',    authenticate, requireRole('admin','driver'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
