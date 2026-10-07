(async () => {
  const jar = {};
  function cookies(res) {
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      jar[kv.slice(0, i)] = kv.slice(i + 1);
    }
  }
  function header() {
    return Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
  }
  async function get(url) {
    const r = await fetch(url, { headers: { cookie: header() } });
    cookies(r);
    const t = await r.text();
    return { r, t };
  }
  async function post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: header()
      },
      body
    });
    cookies(r);
    return r;
  }
  let page = await get('http://localhost:3000/admin/login');
  const csrf = (page.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  let r = await post(
    'http://localhost:3000/admin/login',
    new URLSearchParams({ _csrf: csrf, email: 'admin@kharidonow.com', password: 'admin123' }).toString()
  );
  console.log('admin login', r.status, r.headers.get('location'));
  const dash = await get('http://localhost:3000/admin');
  console.log('dashboard', dash.r.status, dash.t.includes('Revenue'));
  const orders = await get('http://localhost:3000/admin/orders');
  console.log('orders page', orders.r.status, orders.t.includes('KN10000001'));
  const shop = await get('http://localhost:3000/shop?category=cat-men');
  console.log('men shop', shop.r.status, shop.t.includes('Oxford'));
  const prod = await get('http://localhost:3000/product/floral-summer-dress');
  const csrf2 = (prod.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const pid = (prod.t.match(/name="productId" value="([^"]+)"/) || [])[1];
  r = await post(
    'http://localhost:3000/cart/add',
    new URLSearchParams({ _csrf: csrf2, productId: pid, size: 'M', color: 'Floral Pink', qty: '1', next: '/cart' }).toString()
  );
  console.log('add cart', r.status, r.headers.get('location'));
  const cart = await get('http://localhost:3000/cart');
  console.log('cart has item', cart.t.includes('Floral Summer Dress'));
  const co = await get('http://localhost:3000/checkout');
  const csrf3 = (co.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  r = await post(
    'http://localhost:3000/checkout',
    new URLSearchParams({
      _csrf: csrf3,
      name: 'Test User',
      phone: '9999999999',
      email: 'test@kharidonow.com',
      line1: '1 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      paymentMethod: 'COD'
    }).toString()
  );
  console.log('checkout', r.status, r.headers.get('location'));
  const orderPage = await get('http://localhost:3000/admin/orders');
  console.log('orders after fix', orderPage.r.status, orderPage.t.includes('Manage') || orderPage.t.includes('KN'));
  const dash2 = await get('http://localhost:3000/admin');
  console.log('dashboard after fix', dash2.r.status, dash2.t.includes('Revenue'));
  const products = await get('http://localhost:3000/admin/products');
  console.log('admin products', products.r.status, products.t.includes('Add product'));
  const oid = (orderPage.t.match(/href="\/admin\/orders\/([^"]+)"/) || [])[1];
  if (oid) {
    const det = await get('http://localhost:3000/admin/orders/' + oid);
    const csrf4 = (det.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
    r = await post(
      'http://localhost:3000/admin/orders/' + oid + '/status',
      new URLSearchParams({ _csrf: csrf4, status: 'Delivered', paymentStatus: 'Paid', note: 'Handed over' }).toString()
    );
    console.log('status update', r.status, r.headers.get('location'));
    const det2 = await get('http://localhost:3000/admin/orders/' + oid);
    console.log('delivered', det2.t.includes('Delivered'));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
