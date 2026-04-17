require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initializeSchema } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers — allow inline styles/scripts for template rendering
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173' }));

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Initialize database
initializeSchema();
console.log('Database initialized');

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menus', require('./routes/menus'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/publish', require('./routes/publish'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/qrcode', require('./routes/qrcode'));

// Public menu serving (subscription-gated)
app.use('/menu', require('./routes/serve'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// In production, serve the Vue SPA
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback — but not for /api or /menu routes
  app.get(/^\/(?!api|menu).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Main Menu server running on http://localhost:${PORT}`);
});

module.exports = app;
