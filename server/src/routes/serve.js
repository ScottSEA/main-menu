const express = require('express');
const { getDb } = require('../db/schema');

const router = express.Router();

// Serve published menu by restaurant slug
router.get('/:slug', (req, res) => {
  const db = getDb();

  // Find restaurant by slug
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(req.params.slug);
  if (!restaurant) {
    return res.status(404).send('<h1>Menu not found</h1>');
  }

  // Check active subscription
  const sub = db.prepare("SELECT status FROM subscriptions WHERE user_id = ? AND status = 'active'").get(restaurant.user_id);
  if (!sub) {
    return res.status(403).send('<h1>Menu unavailable</h1><p>Subscription inactive.</p>');
  }

  // Get the latest published snapshot for any menu of this restaurant
  const snapshot = db.prepare(`
    SELECT ps.html_content FROM published_snapshots ps
    JOIN menus m ON ps.menu_id = m.id
    WHERE m.restaurant_id = ? AND m.status = 'published'
    ORDER BY ps.published_at DESC
    LIMIT 1
  `).get(restaurant.id);

  if (!snapshot) {
    return res.status(404).send('<h1>No published menu</h1><p>This restaurant has not published a menu yet.</p>');
  }

  res.type('html').send(snapshot.html_content);
});

module.exports = router;
