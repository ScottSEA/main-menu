const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'templates');

function listTemplates() {
  const dirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  return dirs.map(dir => {
    const metaPath = path.join(TEMPLATES_DIR, dir.name, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      defaults: meta.defaults,
    };
  }).filter(Boolean);
}

function getTemplate(templateId) {
  const templateDir = path.join(TEMPLATES_DIR, templateId);
  const metaPath = path.join(templateDir, 'meta.json');
  const htmlPath = path.join(templateDir, 'template.html');

  if (!fs.existsSync(metaPath) || !fs.existsSync(htmlPath)) {
    return null;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const html = fs.readFileSync(htmlPath, 'utf-8');

  return { meta, html };
}

module.exports = { listTemplates, getTemplate };
