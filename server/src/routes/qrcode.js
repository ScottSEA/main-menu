const express = require('express');
const QRCode = require('qrcode');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Generate QR code as data URL
router.post('/generate', async (req, res) => {
  try {
    const { url, size } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Only allow http/https URLs
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'Only http and https URLs are allowed' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (url.length > 1000) {
      return res.status(400).json({ error: 'URL too long (max 1000 characters)' });
    }

    const qrSize = Math.min(Math.max(size || 200, 50), 1000);

    const dataUrl = await QRCode.toDataURL(url, {
      width: qrSize,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({ dataUrl });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
