const jwt = require('jsonwebtoken');
const { getDb } = require('../db/schema');

const KNOWN_DEFAULTS = ['dev-secret-change-me', 'change-me-to-a-random-secret'];
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}
if (KNOWN_DEFAULTS.includes(JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET is set to a known default value. Use a random secret. Exiting.');
  process.exit(1);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;

    // Reject tokens for deleted users or those issued before password change
    const db = getDb();
    const user = db.prepare('SELECT password_changed_at FROM users WHERE id = ?').get(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    if (user.password_changed_at) {
      const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (payload.iat < changedAt) {
        return res.status(401).json({ error: 'Token invalidated by password change' });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { generateToken, authenticate };
