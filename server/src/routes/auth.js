const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db/schema');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many registrations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 12);

    const registerUser = db.transaction(() => {
      db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, password_hash);
      db.prepare('INSERT INTO subscriptions (id, user_id, plan, status) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), id, 'free', 'active');
    });
    registerUser();

    const token = generateToken({ id, email });
    res.status(201).json({ token, user: { id, email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);

    // Always return success to avoid leaking whether an email exists
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Invalidate any existing unused reset tokens for this user
    db.prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0").run(user.id);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(
      'INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt);

    // TODO: Send email via a real mail service. For now, log the link.
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    console.log(`[Password Reset] Link for ${email}: ${resetUrl}`);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const db = getDb();

    const reset = db.prepare(
      "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')"
    ).get(tokenHash);

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const applyReset = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?").run(passwordHash, reset.user_id);
      db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(reset.user_id);
    });
    applyReset();

    res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const applyChange = db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?").run(passwordHash, user.id);
      db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);
    });
    applyChange();

    const token = generateToken({ id: user.id, email: req.user.email });
    res.json({ message: 'Password changed successfully', token });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const subscription = db.prepare('SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);

  res.json({ user, subscription });
});

module.exports = router;
