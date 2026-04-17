const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/schema');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

// Multer config: memory storage so we can process with sharp before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept common image extensions and MIME types
    // We validate actual content with sharp after upload
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

router.use(authenticate);

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate actual image content (not just extension/mimetype)
    const metadata = await sharp(req.file.buffer).metadata();
    if (!metadata.format) {
      return res.status(400).json({ error: 'Invalid image file' });
    }

    // Enforce max dimensions
    const MAX_DIM = 4096;
    if (metadata.width > MAX_DIM || metadata.height > MAX_DIM) {
      return res.status(400).json({ error: `Image dimensions must not exceed ${MAX_DIM}x${MAX_DIM}` });
    }

    // Re-encode to strip EXIF and normalize format
    const filename = `${crypto.randomUUID()}.webp`;
    const outputPath = path.join(UPLOADS_DIR, filename);

    await sharp(req.file.buffer)
      .rotate() // auto-rotate based on EXIF before stripping
      .webp({ quality: 85 })
      .toFile(outputPath);

    const url = `/uploads/${filename}`;

    // Track upload ownership
    const db = getDb();
    db.prepare('INSERT INTO uploads (id, user_id, filename, original_name) VALUES (?, ?, ?, ?)').run(
      crypto.randomUUID(), req.user.id, filename, req.file.originalname
    );

    res.status(201).json({ url, filename });
  } catch (err) {
    if (err.message && err.message.includes('Only')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/:filename', (req, res) => {
  const filename = req.params.filename;

  // Sanitize filename to prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Verify ownership
  const db = getDb();
  const upload = db.prepare('SELECT * FROM uploads WHERE filename = ? AND user_id = ?').get(filename, req.user.id);
  if (!upload) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM uploads WHERE id = ?').run(upload.id);
  res.status(204).send();
});

module.exports = router;
