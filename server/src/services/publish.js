const Handlebars = require('handlebars');
const crypto = require('crypto');
const { getDb } = require('../db/schema');
const { getTemplate } = require('./templates');

function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Split categories into columns for the template
function splitIntoColumns(categories, numColumns) {
  const columns = Array.from({ length: numColumns }, () => []);
  categories.forEach((cat, i) => {
    columns[i % numColumns].push(cat);
  });
  return columns;
}

function compileMenu(menuId) {
  const db = getDb();

  const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId);
  if (!menu) throw new Error('Menu not found');

  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(menu.restaurant_id);
  if (!restaurant) throw new Error('Restaurant not found');

  const templateId = menu.template_id || 'classic';
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Template "${templateId}" not found`);

  const settings = { ...template.meta.defaults, ...JSON.parse(menu.settings_json || '{}') };

  // Build page data
  const pages = db.prepare('SELECT * FROM menu_pages WHERE menu_id = ? ORDER BY page_order').all(menuId);

  const pageData = pages.map(page => {
    const categories = db.prepare('SELECT * FROM menu_categories WHERE menu_page_id = ? ORDER BY sort_order').all(page.id);

    const categoriesWithItems = categories.map(cat => {
      const items = db.prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY sort_order').all(cat.id);
      return {
        ...cat,
        items: items.map(item => ({
          ...item,
          formattedPrice: formatPrice(item.price_cents),
          dietaryTags: JSON.parse(item.dietary_tags || '[]'),
        })),
      };
    });

    const numColumns = settings.columns || 2;
    return {
      ...page,
      columns: splitIntoColumns(categoriesWithItems, numColumns),
    };
  });

  // Whitelist allowed settings keys to prevent overriding structural template data
  const ALLOWED_SETTINGS = ['fontFamily', 'backgroundColor', 'textColor', 'accentColor', 'columns', 'showPrices', 'showDescriptions', 'qrDataUrl', 'rotationInterval'];
  const safeSettings = {};
  for (const key of ALLOWED_SETTINGS) {
    if (key in settings) {
      safeSettings[key] = settings[key];
    }
  }

  // Compile the Handlebars template
  const compiled = Handlebars.compile(template.html);
  const html = compiled({
    ...safeSettings,
    restaurantName: restaurant.name,
    logoUrl: restaurant.logo_url,
    widthPx: menu.width_px,
    heightPx: menu.height_px,
    qrDataUrl: settings.qrDataUrl || null,
    pages: pageData,
  });

  return html;
}

function publishMenu(menuId) {
  const db = getDb();
  const html = compileMenu(menuId);

  // Get current max version
  const latest = db.prepare('SELECT MAX(version) as v FROM published_snapshots WHERE menu_id = ?').get(menuId);
  const version = (latest?.v || 0) + 1;

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO published_snapshots (id, menu_id, version, html_content, published_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, menuId, version, html);

  db.prepare("UPDATE menus SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(menuId);

  return { id, version, html };
}

module.exports = { compileMenu, publishMenu };
