const express = require('express');
const { listTemplates } = require('../services/templates');

const router = express.Router();

router.get('/', (req, res) => {
  const templates = listTemplates();
  res.json(templates);
});

module.exports = router;
