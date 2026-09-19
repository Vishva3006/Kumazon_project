const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const findById = db.prepare('SELECT id, name, email FROM users WHERE id = ?');
const insertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
);

// Start a fresh session for the user (prevents session fixation).
function startSession(req, userId, cb) {
  req.session.regenerate(err => {
    if (err) return cb(err);
    req.session.userId = userId;
    req.session.save(cb);
  });
}

router.post('/register', (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Enter your name (at least 2 characters).' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  if (findByEmail.get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Log in instead.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = insertUser.run(name, email, hash);

  startSession(req, lastInsertRowid, err => {
    if (err) return next(err);
    res.status(201).json(findById.get(lastInsertRowid));
  });
});

router.post('/login', (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = findByEmail.get(email);
  // Same message for unknown email and wrong password.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  startSession(req, user.id, err => {
    if (err) return next(err);
    res.json({ id: user.id, name: user.name, email: user.email });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  const user = req.session.userId ? findById.get(req.session.userId) : null;
  res.json({ user: user || null });
});

module.exports = router;
