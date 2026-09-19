/* Shared helpers used by every page. */

const money = cents => '$' + (cents / 100).toFixed(2);

const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- API ---------- */
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- Cart (kept in the browser so guests can shop before logging in) ---------- */
const Cart = {
  KEY: 'bench_cart',
  get() {
    try {
      const items = JSON.parse(localStorage.getItem(this.KEY));
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },
  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    updateCartCount();
  },
  add(productId, quantity = 1) {
    const items = this.get();
    const line = items.find(i => i.productId === productId);
    if (line) line.quantity = Math.min(99, line.quantity + quantity);
    else items.push({ productId, quantity: Math.min(99, quantity) });
    this.save(items);
  },
  setQty(productId, quantity) {
    const items = this.get();
    const line = items.find(i => i.productId === productId);
    if (!line) return;
    line.quantity = Math.max(1, Math.min(99, quantity));
    this.save(items);
  },
  remove(productId) {
    this.save(this.get().filter(i => i.productId !== productId));
  },
  clear() {
    this.save([]);
  },
  count() {
    return this.get().reduce((n, i) => n + i.quantity, 0);
  }
};

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = Cart.count();
}

/* ---------- Product artwork (simple drawn parts, no image files needed) ---------- */
const ART = {
  Boards:          { bg: '#1d6f73', fg: '#dff0ee', accent: '#f4c20d' },
  Sensors:         { bg: '#f4c20d', fg: '#0e2a33', accent: '#0e2a33' },
  Motors:          { bg: '#3a5560', fg: '#e8eeee', accent: '#f4c20d' },
  Displays:        { bg: '#0e2a33', fg: '#8fe3d0', accent: '#f4c20d' },
  'Kits & Wiring': { bg: '#a9c4b8', fg: '#0e2a33', accent: '#f4c20d' },
  Tools:           { bg: '#d8dedc', fg: '#0e2a33', accent: '#f4c20d' }
};

function partArt(category) {
  const c = ART[category] || ART.Tools;
  let shapes = '';

  if (category === 'Boards') {
    let pins = '';
    for (let i = 0; i < 10; i++) {
      pins += `<rect x="${52 + i * 10}" y="28" width="5" height="9" fill="${c.accent}"/>`;
      pins += `<rect x="${52 + i * 10}" y="113" width="5" height="9" fill="${c.accent}"/>`;
    }
    shapes = `<rect x="45" y="36" width="110" height="78" rx="4" fill="${c.fg}"/>${pins}
      <rect x="85" y="56" width="30" height="30" rx="2" fill="${c.bg}"/>
      <rect x="55" y="92" width="24" height="12" rx="2" fill="${c.bg}" opacity=".35"/>`;
  } else if (category === 'Sensors') {
    shapes = `<rect x="38" y="40" width="124" height="70" rx="4" fill="${c.fg}"/>
      <circle cx="75" cy="75" r="24" fill="${c.bg}"/><circle cx="75" cy="75" r="14" fill="${c.fg}"/>
      <circle cx="125" cy="75" r="24" fill="${c.bg}"/><circle cx="125" cy="75" r="14" fill="${c.fg}"/>`;
  } else if (category === 'Motors') {
    shapes = `<circle cx="88" cy="75" r="40" fill="${c.fg}"/><circle cx="88" cy="75" r="12" fill="${c.bg}"/>
      <rect x="126" y="69" width="36" height="12" fill="${c.accent}"/>`;
  } else if (category === 'Displays') {
    shapes = `<rect x="38" y="30" width="124" height="90" rx="4" fill="#173c46" stroke="${c.fg}" stroke-width="3"/>
      <rect x="52" y="46" width="70" height="7" fill="${c.fg}"/><rect x="52" y="62" width="96" height="7" fill="${c.fg}"/>
      <rect x="52" y="78" width="54" height="7" fill="${c.fg}"/><rect x="52" y="94" width="84" height="7" fill="${c.fg}" opacity=".5"/>`;
  } else if (category === 'Kits & Wiring') {
    shapes = `<path d="M30 105 C 70 30, 100 130, 170 45" stroke="${c.fg}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M30 80 C 80 120, 110 40, 170 95" stroke="${c.accent}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="105" r="8" fill="${c.fg}"/><circle cx="170" cy="45" r="8" fill="${c.fg}"/>
      <circle cx="30" cy="80" r="8" fill="${c.accent}"/><circle cx="170" cy="95" r="8" fill="${c.accent}"/>`;
  } else {
    shapes = `<line x1="45" y1="118" x2="140" y2="45" stroke="${c.fg}" stroke-width="12" stroke-linecap="round"/>
      <line x1="140" y1="45" x2="160" y2="30" stroke="${c.accent}" stroke-width="8" stroke-linecap="round"/>`;
  }

  return `<svg viewBox="0 0 200 150" role="img" aria-label="${esc(category)}" preserveAspectRatio="xMidYMid slice">
    <rect width="200" height="150" fill="${c.bg}"/>${shapes}</svg>`;
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

/* ---------- Header ---------- */
function renderHeader(user) {
  const host = document.getElementById('site-header');
  if (!host) return;
  const q = new URLSearchParams(location.search).get('search') || '';

  host.className = 'site-header';
  host.innerHTML = `
    <div class="site-header__inner">
      <a class="brand" href="/index.html">
        <svg class="brand__mark" viewBox="0 0 26 26" aria-hidden="true">
          <rect x="1" y="1" width="24" height="24" rx="3" fill="#f4c20d"/>
          <path d="M6 13h5l2-5 3 10 2-5h2" stroke="#0e2a33" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Kumazon
      </a>
      <form class="search" action="/index.html" method="get" role="search">
        <input type="search" name="search" value="${esc(q)}" placeholder="Search parts, e.g. servo" aria-label="Search products">
        <button type="submit">Search</button>
      </form>
      <nav class="nav" aria-label="Main">
        ${
          user
            ? `<span class="nav__user">${esc(user.name)}</span>
               <a href="/orders.html">My orders</a>
               <button type="button" id="logout-btn">Log out</button>`
            : `<a href="/login.html">Log in</a><a href="/register.html">Sign up</a>`
        }
        <a href="/cart.html">Cart<span class="cart-count" id="cart-count">${Cart.count()}</span></a>
      </nav>
    </div>`;

  const logout = document.getElementById('logout-btn');
  if (logout) {
    logout.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      location.href = '/index.html';
    });
  }
}

/* Every page calls this first. Returns the logged-in user or null. */
async function initPage({ requireLogin = false } = {}) {
  let user = null;
  try {
    user = (await api('/api/auth/me')).user;
  } catch { /* header still renders for guests */ }

  if (requireLogin && !user) {
    location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
    return null;
  }
  renderHeader(user);
  return user;
}

/* Only allow redirects back to pages on this site. */
function safeNext(fallback = '/index.html') {
  const next = new URLSearchParams(location.search).get('next') || '';
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function stockLabel(stock) {
  if (stock === 0) return '<span class="stock stock--low">Out of stock</span>';
  if (stock <= 10) return `<span class="stock stock--low">Only ${stock} left</span>`;
  return '<span class="stock">In stock</span>';
}
