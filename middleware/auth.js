function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Log in to continue.' });
  }
  next();
}

module.exports = { requireLogin };
