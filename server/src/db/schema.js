const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'main-menu.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      stripe_customer_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_subscription_id TEXT UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      current_period_end TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      logo_url TEXT,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      template_id TEXT REFERENCES templates(id),
      width_px INTEGER NOT NULL DEFAULT 1920,
      height_px INTEGER NOT NULL DEFAULT 1080,
      settings_json TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_pages (
      id TEXT PRIMARY KEY,
      menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      page_order INTEGER NOT NULL DEFAULT 0,
      transition_type TEXT DEFAULT 'fade',
      duration_seconds INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      menu_page_id TEXT NOT NULL REFERENCES menu_pages(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      style_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      dietary_tags TEXT DEFAULT '[]',
      is_special INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      file_path TEXT NOT NULL,
      default_settings_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS published_snapshots (
      id TEXT PRIMARY KEY,
      menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      html_content TEXT NOT NULL,
      assets_json TEXT DEFAULT '[]',
      published_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
    CREATE INDEX IF NOT EXISTS idx_restaurants_user ON restaurants(user_id);
    CREATE INDEX IF NOT EXISTS idx_menus_restaurant ON menus(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL UNIQUE,
      original_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
    CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uploads(filename);
  `);

  // Seed templates from disk
  seedTemplates(db);

  return db;
}

function seedTemplates(db) {
  const fs = require('fs');
  const templatesDir = path.join(__dirname, '..', '..', '..', 'templates');

  if (!fs.existsSync(templatesDir)) return;

  const dirs = fs.readdirSync(templatesDir, { withFileTypes: true }).filter(d => d.isDirectory());

  const upsert = db.prepare(`
    INSERT INTO templates (id, name, description, file_path, default_settings_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      file_path = excluded.file_path,
      default_settings_json = excluded.default_settings_json
  `);

  for (const dir of dirs) {
    const metaPath = path.join(templatesDir, dir.name, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    upsert.run(
      meta.id,
      meta.name,
      meta.description || '',
      dir.name,
      JSON.stringify(meta.defaults || {})
    );
  }
}

module.exports = { getDb, initializeSchema };
