# Kumazon: simple e-commerce store

A small online store for electronics parts. Express.js backend, SQLite database, plain HTML/CSS/JavaScript frontend.

## Features

- Product listing with search and category filter
- Product details page with quantity picker and stock display
- Shopping cart that works for guests (kept in the browser) and re-checks prices and stock with the server
- User registration and login (hashed passwords, server-side sessions)
- Checkout and order processing: stock is reduced and the order is saved in one database transaction
- Order history page

## Run it

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. The database file (`store.db`) and 16 sample products are created on first start.

## Deploy on Render

This repository includes [`render.yaml`](./render.yaml) for Render deployment. Create a new Blueprint from this repository in the Render dashboard and select the `main` branch. The configuration creates a Node web service with a persistent disk for SQLite and generates a session secret automatically.

The persistent disk uses `DATA_DIR` so the database survives service restarts and deploys.

Useful options:

```bash
PORT=4000 npm start                 # different port
SESSION_SECRET=long-random-text npm start   # keep sessions valid across restarts
npm run reseed                      # reset products (this also clears orders)
```

## Project structure

```
server.js            Express app: sessions, routes, static files
db.js                SQLite connection, schema, sample data
middleware/auth.js   requireLogin guard
routes/auth.js       register, login, logout, current user
routes/products.js   list/search, categories, single product, cart lookup
routes/orders.js     place order (transaction), order history
public/              Frontend pages
  index.html         product listing
  product.html       product details
  cart.html          shopping cart
  checkout.html      shipping form and order summary
  orders.html        order history
  login.html, register.html
  js/app.js          shared code: API helper, cart, header, product art
  css/style.css
```

## Database

| Table | Columns |
|---|---|
| users | id, name, email (unique), password_hash, created_at |
| products | id, name, description, price_cents, category, stock |
| orders | id, user_id, total_cents, status, shipping_name, shipping_address, shipping_city, shipping_zip, created_at |
| order_items | id, order_id, product_id, name, unit_price_cents, quantity |

Prices are stored as integer cents. `order_items` keeps the name and price at the time of purchase, so old orders stay correct if a product changes later.

## API

| Method | Path | Notes |
|---|---|---|
| GET | /api/products?search=&category= | List products |
| GET | /api/products/categories | Categories with counts |
| GET | /api/products/:id | One product |
| POST | /api/products/lookup | `{ ids: [1,2] }` returns current price and stock |
| POST | /api/auth/register | `{ name, email, password }` |
| POST | /api/auth/login | `{ email, password }` |
| POST | /api/auth/logout | |
| GET | /api/auth/me | `{ user }` or `{ user: null }` |
| POST | /api/orders | Login required. `{ items: [{ productId, quantity }], shipping: { name, address, city, zip } }` |
| GET | /api/orders | Login required. Your orders |
| GET | /api/orders/:id | Login required. One of your orders |

## Design notes

- **Prices come from the database, never from the browser.** The order endpoint ignores any price sent by the client.
- **Orders are all-or-nothing.** If one item is out of stock, no stock is reduced and no order is saved.
- **Passwords** are hashed with bcrypt. Login errors do not reveal whether the email exists.
- **SQL** uses prepared statements throughout. Text shown on pages is HTML-escaped.

## Ideas for extending it

- Admin pages to add and edit products
- Real payments (for example Stripe Checkout) before marking an order as paid
- Order status updates (shipped, delivered)
- Product images uploaded to a folder instead of the drawn placeholders
- Rate limiting on login, HTTPS and `cookie.secure: true` when deployed
