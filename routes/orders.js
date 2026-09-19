const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
const insertOrder = db.prepare(`
  INSERT INTO orders (user_id, total_cents, shipping_name, shipping_address, shipping_city, shipping_zip)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity)
  VALUES (?, ?, ?, ?, ?)
`);

// Runs as one transaction: if any item is out of stock, nothing is saved.
const placeOrder = db.transaction((userId, items, shipping) => {
  let total = 0;
  const lines = [];

  for (const { productId, quantity } of items) {
    const product = getProduct.get(productId);
    if (!product) throw new HttpError(400, 'A product in your cart no longer exists.');
    if (product.stock < quantity) {
      throw new HttpError(
        409,
        product.stock === 0
          ? `${product.name} is out of stock.`
          : `Only ${product.stock} of ${product.name} left in stock.`
      );
    }
    reduceStock.run(quantity, productId);
    total += product.price_cents * quantity; // price always comes from the database
    lines.push({ product, quantity });
  }

  const { lastInsertRowid: orderId } = insertOrder.run(
    userId, total, shipping.name, shipping.address, shipping.city, shipping.zip
  );
  for (const { product, quantity } of lines) {
    insertItem.run(orderId, product.id, product.name, product.price_cents, quantity);
  }
  return orderId;
});

function loadOrder(orderId, userId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
  return order;
}

// POST /api/orders  { items: [{ productId, quantity }], shipping: { name, address, city, zip } }
router.post('/', (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length) throw new HttpError(400, 'Your cart is empty.');

    // Merge duplicate product ids and validate quantities.
    const merged = new Map();
    for (const it of rawItems) {
      const productId = Number(it.productId);
      const quantity = Number(it.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new HttpError(400, 'Invalid item in cart.');
      }
      merged.set(productId, (merged.get(productId) || 0) + quantity);
    }
    const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));

    const s = req.body.shipping || {};
    const shipping = {
      name: String(s.name || '').trim(),
      address: String(s.address || '').trim(),
      city: String(s.city || '').trim(),
      zip: String(s.zip || '').trim()
    };
    if (!shipping.name || !shipping.address || !shipping.city || !shipping.zip) {
      throw new HttpError(400, 'Fill in all shipping fields.');
    }

    const orderId = placeOrder(req.session.userId, items, shipping);
    res.status(201).json(loadOrder(orderId, req.session.userId));
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.userId);
  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
  orders.forEach(o => (o.items = itemsStmt.all(o.id)));
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = loadOrder(Number(req.params.id), req.session.userId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

module.exports = router;
