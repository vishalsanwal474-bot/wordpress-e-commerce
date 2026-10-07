const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, save } = require('./lib/db');
const {
  slugify, inr, cartCount, cartTotals, orderNo, csrfToken, requireCsrf, uuid,
  deliveryWindow, paginate
} = require('./lib/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 4 * 1024 * 1024 }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'kharidonow-store-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  if (!req.session.recent) req.session.recent = [];
  const store = db();
  res.locals.storeName = 'KharidoNow';
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart;
  res.locals.cartCount = cartCount(req.session.cart);
  res.locals.categories = store.categories;
  res.locals.csrf = csrfToken(req);
  res.locals.inr = inr;
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function currentUser(req) {
  if (!req.session.user) return null;
  return db().users.find((u) => u.id === req.session.user.id) || null;
}

function requireUser(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/admin/login');
  }
  next();
}

function productBySlug(slug) {
  return db().products.find((p) => p.slug === slug);
}

function applyFilters(products, q) {
  let list = products.slice();
  if (q.category) list = list.filter((p) => p.categoryId === q.category);
  if (q.q) {
    const s = q.q.toLowerCase();
    list = list.filter((p) =>
      (p.name + p.brand + p.description).toLowerCase().includes(s)
    );
  }
  if (q.gender) list = list.filter((p) => p.gender === q.gender);
  if (q.min) list = list.filter((p) => p.price >= Number(q.min));
  if (q.max) list = list.filter((p) => p.price <= Number(q.max));
  if (q.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (q.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (q.sort === 'rating') list.sort((a, b) => b.ratingAvg - a.ratingAvg);
  else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return list;
}

app.get('/', (req, res) => {
  const store = db();
  const featured = store.products.filter((p) => p.featured);
  const deals = store.products.filter((p) => p.comparePrice > p.price).slice(0, 8);
  const men = store.products.filter((p) => p.gender === 'Men').slice(0, 4);
  const women = store.products.filter((p) => p.gender === 'Women').slice(0, 4);
  const recent = store.products.filter((p) => (req.session.recent || []).includes(p.id)).slice(0, 4);
  res.render('home', { featured, deals, men, women, recent });
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const hits = db().products
    .filter((p) => (p.name + ' ' + p.brand).toLowerCase().includes(q))
    .slice(0, 8)
    .map((p) => ({ name: p.name, brand: p.brand, price: p.price, slug: p.slug, image: p.image }));
  res.json(hits);
});

app.get('/shop', (req, res) => {
  const store = db();
  const filtered = applyFilters(store.products, req.query);
  const pageData = paginate(filtered, req.query.page, 8);
  const category = store.categories.find((c) => c.id === req.query.category);
  res.render('shop', {
    products: pageData.items,
    pageData,
    category,
    title: category ? category.name : 'All Clothing'
  });
});

app.get('/product/:slug', (req, res) => {
  const store = db();
  const product = productBySlug(req.params.slug);
  if (!product) return res.status(404).render('404');
  req.session.recent = [product.id, ...(req.session.recent || []).filter((id) => id !== product.id)].slice(0, 8);
  const reviews = store.reviews.filter((r) => r.productId === product.id);
  const related = store.products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  const wished = !!(req.session.user && (store.wishlists.find((w) => w.userId === req.session.user.id)?.productIds || []).includes(product.id));
  const delivery = deliveryWindow();
  res.render('product', { product, reviews, related, wished, delivery });
});

app.post('/cart/add', requireCsrf, (req, res) => {
  const { productId, size, color, qty } = req.body;
  const product = db().products.find((p) => p.id === productId);
  if (!product) return res.redirect('/shop');
  const amount = Math.max(1, Number(qty || 1));
  const cart = req.session.cart;
  const existing = cart.find((i) => i.productId === productId && i.size === size && i.color === color);
  if (existing) existing.qty += amount;
  else cart.push({ productId, size: size || product.sizes[0], color: color || product.colors[0], qty: amount });
  setFlash(req, 'notice', 'Added to cart');
  const next = req.body.next || '/cart';
  res.redirect(next);
});

app.post('/cart/update', requireCsrf, (req, res) => {
  const { index, qty } = req.body;
  const i = Number(index);
  const amount = Number(qty);
  if (req.session.cart[i]) {
    if (amount <= 0) req.session.cart.splice(i, 1);
    else req.session.cart[i].qty = amount;
  }
  res.redirect('/cart');
});

app.post('/cart/remove', requireCsrf, (req, res) => {
  const i = Number(req.body.index);
  if (req.session.cart[i]) req.session.cart.splice(i, 1);
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const store = db();
  const coupon = store.coupons.find((c) => c.code === req.session.coupon && c.active);
  const totals = cartTotals(req.session.cart, store.products, coupon);
  res.render('cart', { totals, coupon, error: req.query.error, notice: req.query.ok });
});

app.post('/cart/coupon', requireCsrf, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const coupon = db().coupons.find((c) => c.code === code && c.active);
  if (!coupon) return res.redirect('/cart?error=Invalid+coupon');
  req.session.coupon = coupon.code;
  res.redirect('/cart?ok=Coupon+applied');
});

app.get('/checkout', (req, res) => {
  const store = db();
  if (!req.session.cart.length) return res.redirect('/cart');
  const coupon = store.coupons.find((c) => c.code === req.session.coupon && c.active);
  const totals = cartTotals(req.session.cart, store.products, coupon);
  const addresses = req.session.user
    ? store.addresses.filter((a) => a.userId === req.session.user.id)
    : [];
  res.render('checkout', { totals, addresses, coupon });
});

app.post('/checkout', requireCsrf, (req, res) => {
  const store = db();
  if (!req.session.cart.length) return res.redirect('/cart');
  const coupon = store.coupons.find((c) => c.code === req.session.coupon && c.active);
  const totals = cartTotals(req.session.cart, store.products, coupon);
  if (!totals.lines.length) return res.redirect('/cart');

  let userId = req.session.user?.id || null;
  if (!userId) {
    const email = String(req.body.email || '').toLowerCase();
    let user = store.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: uuid(),
        name: req.body.name,
        email,
        phone: req.body.phone,
        password: bcrypt.hashSync(uuid().slice(0, 8), 8),
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      store.users.push(user);
    }
    userId = user.id;
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  const address = {
    name: req.body.name,
    phone: req.body.phone,
    line1: req.body.line1,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode
  };

  totals.lines.forEach((line) => {
    const p = store.products.find((x) => x.id === line.productId);
    if (p) p.stock = Math.max(0, p.stock - line.qty);
  });

  const order = {
    id: uuid(),
    orderNo: orderNo(),
    userId,
    status: 'Pending',
    paymentMethod: req.body.paymentMethod || 'COD',
    paymentStatus: req.body.paymentMethod === 'UPI' ? 'Paid' : 'Pending',
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    address,
    items: totals.lines.map((l) => ({
      productId: l.productId,
      name: l.product.name,
      price: l.price,
      qty: l.qty,
      size: l.size,
      color: l.color,
      image: l.product.image
    })),
    timeline: [{ status: 'Pending', at: new Date().toISOString() }],
    createdAt: new Date().toISOString()
  };
  store.orders.unshift(order);
  save();
  req.session.cart = [];
  req.session.coupon = null;
  res.redirect('/order/' + order.orderNo + '?placed=1');
});

app.get('/order/:orderNo', requireUser, (req, res) => {
  const order = db().orders.find((o) => o.orderNo === req.params.orderNo);
  if (!order) return res.status(404).render('404');
  if (req.session.user.role !== 'admin' && order.userId !== req.session.user.id) {
    return res.status(403).send('Not allowed');
  }
  res.render('order', { order, placed: req.query.placed });
});

app.post('/order/:orderNo/cancel', requireUser, requireCsrf, (req, res) => {
  const store = db();
  const order = store.orders.find((o) => o.orderNo === req.params.orderNo);
  if (!order) return res.status(404).render('404');
  if (order.userId !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).send('Not allowed');
  }
  const cancellable = ['Pending', 'Confirmed'];
  if (!cancellable.includes(order.status)) {
    setFlash(req, 'error', 'This order can no longer be cancelled.');
    return res.redirect('/order/' + order.orderNo);
  }
  order.items.forEach((item) => {
    const product = store.products.find((p) => p.id === item.productId);
    if (product) product.stock += item.qty;
  });
  order.status = 'Cancelled';
  if (order.paymentStatus === 'Paid') order.paymentStatus = 'Refunded';
  order.timeline = order.timeline || [];
  order.timeline.push({ status: 'Cancelled', at: new Date().toISOString(), note: 'Cancelled by customer' });
  save();
  setFlash(req, 'notice', 'Order cancelled. Stock has been restored.');
  res.redirect('/order/' + order.orderNo);
});

app.get('/orders', requireUser, (req, res) => {
  const orders = db().orders.filter((o) => o.userId === req.session.user.id);
  res.render('orders', { orders });
});

app.get('/track', (req, res) => {
  const order = req.query.orderNo
    ? db().orders.find((o) => o.orderNo.toLowerCase() === String(req.query.orderNo).toLowerCase())
    : null;
  res.render('track', { order, searched: !!req.query.orderNo });
});

app.get('/wishlist', requireUser, (req, res) => {
  const store = db();
  const row = store.wishlists.find((w) => w.userId === req.session.user.id);
  const products = store.products.filter((p) => (row?.productIds || []).includes(p.id));
  res.render('wishlist', { products });
});

app.post('/wishlist/toggle', requireUser, requireCsrf, (req, res) => {
  const store = db();
  let row = store.wishlists.find((w) => w.userId === req.session.user.id);
  if (!row) {
    row = { userId: req.session.user.id, productIds: [] };
    store.wishlists.push(row);
  }
  const id = req.body.productId;
  const i = row.productIds.indexOf(id);
  if (i >= 0) row.productIds.splice(i, 1);
  else row.productIds.push(id);
  save();
  res.redirect(req.body.next || '/wishlist');
});

app.post('/review', requireUser, requireCsrf, (req, res) => {
  const store = db();
  const product = store.products.find((p) => p.id === req.body.productId);
  if (!product) return res.redirect('/');
  store.reviews.unshift({
    id: uuid(),
    productId: product.id,
    userId: req.session.user.id,
    userName: req.session.user.name,
    rating: Math.min(5, Math.max(1, Number(req.body.rating))),
    comment: String(req.body.comment || '').slice(0, 500),
    createdAt: new Date().toISOString()
  });
  const list = store.reviews.filter((r) => r.productId === product.id);
  product.ratingCount = list.length;
  product.ratingAvg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  save();
  res.redirect('/product/' + product.slug);
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/account');
  res.render('login', { error: null, next: req.query.next || '/account' });
});

app.post('/login', requireCsrf, (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const user = db().users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password)) {
    return res.render('login', { error: 'Email or password is incorrect.', next: req.body.next || '/account' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect(req.body.next || (user.role === 'admin' ? '/admin' : '/account'));
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', requireCsrf, (req, res) => {
  const store = db();
  const email = String(req.body.email || '').toLowerCase();
  if (store.users.find((u) => u.email === email)) {
    return res.render('register', { error: 'An account with this email already exists.' });
  }
  const user = {
    id: uuid(),
    name: req.body.name,
    email,
    phone: req.body.phone,
    password: bcrypt.hashSync(req.body.password || 'password', 10),
    role: 'customer',
    createdAt: new Date().toISOString()
  };
  store.users.push(user);
  store.wishlists.push({ userId: user.id, productIds: [] });
  save();
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/account');
});

app.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
});

app.get('/account', requireUser, (req, res) => {
  const store = db();
  const addresses = store.addresses.filter((a) => a.userId === req.session.user.id);
  const orders = store.orders.filter((o) => o.userId === req.session.user.id);
  res.render('account', { addresses, orders, userFull: currentUser(req) });
});

app.post('/account/address', requireUser, requireCsrf, (req, res) => {
  const store = db();
  store.addresses.push({
    id: uuid(),
    userId: req.session.user.id,
    name: req.body.name,
    phone: req.body.phone,
    line1: req.body.line1,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    isDefault: store.addresses.filter((a) => a.userId === req.session.user.id).length === 0
  });
  save();
  setFlash(req, 'notice', 'Address saved.');
  res.redirect('/account');
});

app.post('/account/profile', requireUser, requireCsrf, (req, res) => {
  const user = currentUser(req);
  if (!user) return res.redirect('/login');
  user.name = String(req.body.name || user.name).trim();
  user.phone = String(req.body.phone || user.phone).trim();
  if (req.body.password && String(req.body.password).length >= 6) {
    user.password = bcrypt.hashSync(req.body.password, 10);
  }
  req.session.user.name = user.name;
  save();
  setFlash(req, 'notice', 'Profile updated.');
  res.redirect('/account');
});

app.get('/admin/login', (req, res) => {
  if (req.session.user?.role === 'admin') return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', requireCsrf, (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const user = db().users.find((u) => u.email === email && u.role === 'admin');
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password)) {
    return res.render('admin/login', { error: 'Invalid admin credentials.' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/admin');
});

app.get('/admin', requireAdmin, (req, res) => {
  const store = db();
  const revenue = store.orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  res.render('admin/dashboard', {
    stats: {
      products: store.products.length,
      orders: store.orders.length,
      customers: store.users.filter((u) => u.role === 'customer').length,
      revenue
    },
    recent: store.orders.slice(0, 8)
  });
});

app.get('/admin/products', requireAdmin, (req, res) => {
  res.render('admin/products', { products: db().products });
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
  res.render('admin/product-form', { product: null, categories: db().categories });
});

app.get('/admin/products/:id/edit', requireAdmin, (req, res) => {
  const product = db().products.find((p) => p.id === req.params.id);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', { product, categories: db().categories });
});

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

app.post('/admin/products/save', requireAdmin, requireCsrf, upload.single('imageFile'), (req, res) => {
  const store = db();
  const body = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (body.image || '');
  if (body.id) {
    const product = store.products.find((p) => p.id === body.id);
    if (product) {
      Object.assign(product, {
        name: body.name,
        slug: slugify(body.name),
        sku: body.sku,
        brand: body.brand,
        description: body.description,
        price: Number(body.price),
        comparePrice: Number(body.comparePrice || 0),
        stock: Number(body.stock || 0),
        categoryId: body.categoryId,
        gender: body.gender,
        sizes: parseList(body.sizes),
        colors: parseList(body.colors),
        featured: !!body.featured,
        image: image || product.image
      });
    }
  } else {
    store.products.unshift({
      id: uuid(),
      sku: body.sku || ('KN' + Date.now().toString().slice(-6)),
      slug: slugify(body.name),
      name: body.name,
      brand: body.brand,
      description: body.description,
      price: Number(body.price),
      comparePrice: Number(body.comparePrice || 0),
      stock: Number(body.stock || 0),
      categoryId: body.categoryId,
      gender: body.gender,
      sizes: parseList(body.sizes),
      colors: parseList(body.colors),
      featured: !!body.featured,
      image,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString()
    });
  }
  save();
  res.redirect('/admin/products');
});

app.post('/admin/products/:id/delete', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  store.products = store.products.filter((p) => p.id !== req.params.id);
  save();
  res.redirect('/admin/products');
});

app.get('/admin/categories', requireAdmin, (req, res) => {
  res.render('admin/categories', { categories: db().categories });
});

app.post('/admin/categories/save', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  if (req.body.id) {
    const cat = store.categories.find((c) => c.id === req.body.id);
    if (cat) {
      cat.name = req.body.name;
      cat.slug = slugify(req.body.name);
      cat.image = req.body.image;
    }
  } else {
    store.categories.push({
      id: uuid(),
      name: req.body.name,
      slug: slugify(req.body.name),
      image: req.body.image
    });
  }
  save();
  res.redirect('/admin/categories');
});

app.post('/admin/categories/:id/delete', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  store.categories = store.categories.filter((c) => c.id !== req.params.id);
  save();
  res.redirect('/admin/categories');
});

app.get('/admin/orders', requireAdmin, (req, res) => {
  const status = req.query.status;
  let orders = db().orders;
  if (status) orders = orders.filter((o) => o.status === status);
  res.render('admin/orders', { orders, status: status || '' });
});

const STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];

app.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db().orders.find((o) => o.id === req.params.id);
  if (!order) return res.redirect('/admin/orders');
  res.render('admin/order', { order, statuses: STATUSES });
});

app.post('/admin/orders/:id/status', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  const order = store.orders.find((o) => o.id === req.params.id);
  if (order) {
    order.status = req.body.status;
    if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
    order.timeline = order.timeline || [];
    order.timeline.push({ status: order.status, at: new Date().toISOString(), note: req.body.note || '' });
    save();
  }
  res.redirect('/admin/orders/' + req.params.id);
});

app.get('/admin/customers', requireAdmin, (req, res) => {
  const customers = db().users.filter((u) => u.role === 'customer');
  res.render('admin/customers', { customers });
});

app.post('/admin/customers/:id/delete', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  store.users = store.users.filter((u) => u.id !== req.params.id || u.role === 'admin');
  save();
  res.redirect('/admin/customers');
});

app.get('/admin/reviews', requireAdmin, (req, res) => {
  res.render('admin/reviews', { reviews: db().reviews });
});

app.post('/admin/reviews/:id/delete', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  store.reviews = store.reviews.filter((r) => r.id !== req.params.id);
  save();
  res.redirect('/admin/reviews');
});

app.get('/admin/coupons', requireAdmin, (req, res) => {
  res.render('admin/coupons', { coupons: db().coupons });
});

app.post('/admin/coupons/save', requireAdmin, requireCsrf, (req, res) => {
  const store = db();
  store.coupons.push({
    id: uuid(),
    code: String(req.body.code).toUpperCase(),
    type: req.body.type,
    value: Number(req.body.value),
    minOrder: Number(req.body.minOrder || 0),
    active: true
  });
  save();
  res.redirect('/admin/coupons');
});

app.post('/admin/coupons/:id/toggle', requireAdmin, requireCsrf, (req, res) => {
  const coupon = db().coupons.find((c) => c.id === req.params.id);
  if (coupon) coupon.active = !coupon.active;
  save();
  res.redirect('/admin/coupons');
});

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log('KharidoNow running at http://localhost:' + PORT);
});
