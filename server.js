const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

require('./db'); // creates tables and seeds products on first run

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    // Set SESSION_SECRET in production. A random one means sessions reset on restart.
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use(express.static(path.join(__dirname, 'public')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

app.listen(PORT, () => console.log(`Store running at http://localhost:${PORT}`));
