const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');
const { compileMenu, publishMenu } = require('../services/publish');

const router = express.Router();

// Preview (authenticated — returns compiled HTML for the draft)
router.get('/preview/:menuId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const menu = db.prepare(`
      SELECT m.* FROM menus m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE m.id = ? AND r.user_id = ?
    `).get(req.params.menuId, req.user.id);

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const html = compileMenu(menu.id);
    res.type('html').send(html);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Publish (authenticated — creates a snapshot)
router.post('/:menuId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const menu = db.prepare(`
      SELECT m.* FROM menus m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE m.id = ? AND r.user_id = ?
    `).get(req.params.menuId, req.user.id);

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check subscription (free tier cannot publish)
    const sub = db.prepare(`
      SELECT s.status, s.plan FROM subscriptions s
      JOIN restaurants r ON s.user_id = r.user_id
      WHERE r.id = ? AND s.status = 'active' AND s.plan != 'free'
    `).get(menu.restaurant_id);

    if (!sub) {
      return res.status(403).json({ error: 'Paid subscription required to publish. Upgrade your plan to get started.' });
    }

    const result = publishMenu(menu.id);
    res.json({ message: 'Published', version: result.version });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
