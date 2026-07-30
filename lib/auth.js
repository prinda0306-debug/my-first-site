const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'session';

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET not set, using an insecure default. Set JWT_SECRET in production.');
}

function signSession(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function setSessionCookie(res, user) {
  const token = signSession(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function getSessionUser(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: '請先登入' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: '請先登入' });
  if (user.role !== 'admin') return res.status(403).json({ error: '沒有權限' });
  req.user = user;
  next();
}

module.exports = {
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  requireAuth,
  requireAdmin,
};
