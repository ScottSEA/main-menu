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

    const dataUrl = await QRCode.toDataURL(url, {
      width: size || 200,
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
