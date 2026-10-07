const { v4: uuid } = require('uuid');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function inr(amount) {
  const n = Number(amount) || 0;
  return '₹' + n.toLocaleString('en-IN');
}

function cartCount(cart) {
  return (cart || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function cartTotals(cart, products, coupon) {
  const lines = (cart || []).map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const price = product ? product.price : 0;
    return { ...item, product, price, lineTotal: price * item.qty };
  }).filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  let discount = 0;
  if (coupon && coupon.active) {
    if (!coupon.minOrder || subtotal >= coupon.minOrder) {
      discount = coupon.type === 'percent'
        ? Math.round(subtotal * (coupon.value / 100))
        : coupon.value;
    }
  }
  discount = Math.min(discount, subtotal);
  const shipping = subtotal - discount >= 499 || subtotal === 0 ? 0 : 49;
  const total = Math.max(0, subtotal - discount + shipping);
  return { lines, subtotal, discount, shipping, total };
}

function orderNo() {
  return 'KN' + Date.now().toString().slice(-10);
}

function deliveryWindow(daysFrom = 3, daysTo = 5) {
  const start = new Date();
  start.setDate(start.getDate() + daysFrom);
  const end = new Date();
  end.setDate(end.getDate() + daysTo);
  const fmt = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return { start: fmt(start), end: fmt(end), label: `${fmt(start)} – ${fmt(end)}` };
}

function paginate(items, page, perPage = 8) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    pages,
    total,
    perPage
  };
}

function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = uuid();
  return req.session.csrf;
}

function requireCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrf) {
    return res.status(403).send('Invalid session token. Please go back and try again.');
  }
  next();
}

module.exports = {
  slugify, inr, cartCount, cartTotals, orderNo, csrfToken, requireCsrf, uuid,
  deliveryWindow, paginate
};
