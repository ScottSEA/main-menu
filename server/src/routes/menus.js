const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// --- Restaurants ---

router.get('/restaurants', (req, res) => {
  const db = getDb();
  const restaurants = db.prepare('SELECT * FROM restaurants WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(restaurants);
});

router.post('/restaurants', (req, res) => {
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  if (!slugPattern.test(slug) || slug.length < 3) {
    return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens, at least 3 characters' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM restaurants WHERE slug = ?').get(slug);
  if (existing) {
    return res.status(409).json({ error: 'Slug already taken' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO restaurants (id, user_id, name, slug) VALUES (?, ?, ?, ?)').run(id, req.user.id, name, slug);

  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
  res.status(201).json(restaurant);
});

router.get('/restaurants/:id', (req, res) => {
  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  res.json(restaurant);
});

router.put('/restaurants/:id', (req, res) => {
  const { name } = req.body;
  const db = getDb();

  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  db.prepare('UPDATE restaurants SET name = ? WHERE id = ?').run(name || restaurant.name, req.params.id);
  const updated = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/restaurants/:id', (req, res) => {
  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Menus ---

router.get('/restaurants/:restaurantId/menus', (req, res) => {
  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ? AND user_id = ?').get(req.params.restaurantId, req.user.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const menus = db.prepare('SELECT * FROM menus WHERE restaurant_id = ? ORDER BY created_at DESC').all(req.params.restaurantId);
  res.json(menus);
});

router.post('/restaurants/:restaurantId/menus', (req, res) => {
  const { name, width_px, height_px, template_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Menu name is required' });
  }

  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ? AND user_id = ?').get(req.params.restaurantId, req.user.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO menus (id, restaurant_id, name, template_id, width_px, height_px)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.restaurantId, name, template_id || null, width_px || 1920, height_px || 1080);

  // Create a default first page
  const pageId = uuidv4();
  db.prepare('INSERT INTO menu_pages (id, menu_id, page_order) VALUES (?, ?, 0)').run(pageId, id);

  const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(id);
  res.status(201).json(menu);
});

router.get('/menus/:id', (req, res) => {
  const db = getDb();
  const menu = db.prepare(`
    SELECT m.* FROM menus m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  // Include pages, categories, and items
  const pages = db.prepare('SELECT * FROM menu_pages WHERE menu_id = ? ORDER BY page_order').all(menu.id);

  for (const page of pages) {
    page.categories = db.prepare('SELECT * FROM menu_categories WHERE menu_page_id = ? ORDER BY sort_order').all(page.id);
    for (const category of page.categories) {
      category.items = db.prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY sort_order').all(category.id);
    }
  }

  res.json({ ...menu, pages });
});

router.put('/menus/:id', (req, res) => {
  const { name, width_px, height_px, template_id, settings_json } = req.body;
  const db = getDb();

  const menu = db.prepare(`
    SELECT m.* FROM menus m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  db.prepare(`
    UPDATE menus SET name = ?, width_px = ?, height_px = ?, template_id = ?, settings_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? menu.name,
    width_px ?? menu.width_px,
    height_px ?? menu.height_px,
    template_id !== undefined ? template_id : menu.template_id,
    settings_json ?? menu.settings_json,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menus WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/menus/:id', (req, res) => {
  const db = getDb();
  const menu = db.prepare(`
    SELECT m.id FROM menus m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  db.prepare('DELETE FROM menus WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Categories ---

router.post('/pages/:pageId/categories', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const db = getDb();
  // Verify ownership through the chain: page -> menu -> restaurant -> user
  const page = db.prepare(`
    SELECT mp.id FROM menu_pages mp
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mp.id = ? AND r.user_id = ?
  `).get(req.params.pageId, req.user.id);

  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM menu_categories WHERE menu_page_id = ?').get(req.params.pageId);
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  const id = uuidv4();
  db.prepare('INSERT INTO menu_categories (id, menu_page_id, name, sort_order) VALUES (?, ?, ?, ?)').run(id, req.params.pageId, name, sortOrder);

  const category = db.prepare('SELECT * FROM menu_categories WHERE id = ?').get(id);
  res.status(201).json(category);
});

router.put('/categories/:id', (req, res) => {
  const { name, sort_order, style_json } = req.body;
  const db = getDb();

  const category = db.prepare(`
    SELECT mc.* FROM menu_categories mc
    JOIN menu_pages mp ON mc.menu_page_id = mp.id
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mc.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare(`
    UPDATE menu_categories SET name = ?, sort_order = ?, style_json = ? WHERE id = ?
  `).run(
    name ?? category.name,
    sort_order ?? category.sort_order,
    style_json ?? category.style_json,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menu_categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/categories/:id', (req, res) => {
  const db = getDb();
  const category = db.prepare(`
    SELECT mc.id FROM menu_categories mc
    JOIN menu_pages mp ON mc.menu_page_id = mp.id
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mc.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  db.prepare('DELETE FROM menu_categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// --- Items ---

router.post('/categories/:categoryId/items', (req, res) => {
  const { name, description, price_cents, dietary_tags, is_special } = req.body;

  if (!name || price_cents === undefined) {
    return res.status(400).json({ error: 'Name and price_cents are required' });
  }

  const db = getDb();
  const category = db.prepare(`
    SELECT mc.id FROM menu_categories mc
    JOIN menu_pages mp ON mc.menu_page_id = mp.id
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mc.id = ? AND r.user_id = ?
  `).get(req.params.categoryId, req.user.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM menu_items WHERE category_id = ?').get(req.params.categoryId);
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO menu_items (id, category_id, name, description, price_cents, dietary_tags, is_special, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.categoryId, name, description || null, price_cents, JSON.stringify(dietary_tags || []), is_special ? 1 : 0, sortOrder);

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  res.status(201).json(item);
});

router.put('/items/:id', (req, res) => {
  const { name, description, price_cents, dietary_tags, is_special, sort_order } = req.body;
  const db = getDb();

  const item = db.prepare(`
    SELECT mi.* FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    JOIN menu_pages mp ON mc.menu_page_id = mp.id
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mi.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  db.prepare(`
    UPDATE menu_items SET name = ?, description = ?, price_cents = ?, dietary_tags = ?, is_special = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name ?? item.name,
    description !== undefined ? description : item.description,
    price_cents ?? item.price_cents,
    dietary_tags ? JSON.stringify(dietary_tags) : item.dietary_tags,
    is_special !== undefined ? (is_special ? 1 : 0) : item.is_special,
    sort_order ?? item.sort_order,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/items/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare(`
    SELECT mi.id FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    JOIN menu_pages mp ON mc.menu_page_id = mp.id
    JOIN menus m ON mp.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mi.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
