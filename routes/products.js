const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/products?search=servo&category=Motors
router.get('/', (req, res) => {
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const where = [];
  const params = [];
  if (search) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }

  const sql =
    'SELECT * FROM products' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY id';
  res.json(db.prepare(sql).all(...params));
});

router.get('/categories', (req, res) => {
  res.json(
    db.prepare('SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY category').all()
  );
});

// Cart page sends the ids stored in the browser; return current price and stock.
router.post('/lookup', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (!ids.length) return res.json([]);
  const marks = ids.map(() => '?').join(',');
  res.json(db.prepare(`SELECT * FROM products WHERE id IN (${marks})`).all(...ids));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

module.exports = router;
