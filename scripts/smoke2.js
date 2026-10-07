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
    return { r, t: await r.text() };
  }
  async function post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: header() },
      body
    });
    cookies(r);
    return r;
  }

  const home = await get('http://localhost:3000/');
  console.log('home', home.r.status);
  const shop = await get('http://localhost:3000/shop?page=2');
  console.log('shop page2', shop.r.status, shop.t.includes('page 2 of'));
  const search = await get('http://localhost:3000/api/search?q=shirt');
  console.log('search api', search.r.status, search.t.includes('slug'));
  const prod = await get('http://localhost:3000/product/classic-white-oxford-shirt');
  console.log('delivery eta', prod.t.includes('Delivery by'));

  let login = await get('http://localhost:3000/login');
  let csrf = (login.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  await post('http://localhost:3000/login', new URLSearchParams({
    _csrf: csrf, email: 'user@kharidonow.com', password: 'user123', next: '/account'
  }).toString());

  const co = await get('http://localhost:3000/product/cotton-crew-neck-t-shirt');
  csrf = (co.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const pid = (co.t.match(/name="productId" value="([^"]+)"/) || [])[1];
  await post('http://localhost:3000/cart/add', new URLSearchParams({
    _csrf: csrf, productId: pid, size: 'M', color: 'Black', qty: '1', next: '/checkout'
  }).toString());
  const checkout = await get('http://localhost:3000/checkout');
  csrf = (checkout.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const placed = await post('http://localhost:3000/checkout', new URLSearchParams({
    _csrf: csrf,
    name: 'Aarav Sharma',
    phone: '9876543210',
    line1: '221 Green Park',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110016',
    paymentMethod: 'COD'
  }).toString());
  const loc = placed.headers.get('location') || '';
  console.log('placed', placed.status, loc);
  const orderNo = (loc.match(/\/order\/([^?]+)/) || [])[1];
  const orderPage = await get('http://localhost:3000' + loc.split('?')[0]);
  csrf = (orderPage.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const cancel = await post('http://localhost:3000/order/' + orderNo + '/cancel', new URLSearchParams({ _csrf: csrf }).toString());
  console.log('cancel', cancel.status, cancel.headers.get('location'));
  const cancelled = await get('http://localhost:3000/order/' + orderNo);
  console.log('cancelled status', cancelled.t.includes('Cancelled'));

  const account = await get('http://localhost:3000/account');
  csrf = (account.t.match(/action="\/account\/profile"[\s\S]*?name="_csrf" value="([^"]+)"/) || account.t.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const profile = await post('http://localhost:3000/account/profile', new URLSearchParams({
    _csrf: csrf, name: 'Aarav S', phone: '9876543210'
  }).toString());
  console.log('profile', profile.status, profile.headers.get('location'));

  const home2 = await get('http://localhost:3000/');
  console.log('recently viewed', home2.t.includes('Recently viewed'));
})().catch((e) => { console.error(e); process.exit(1); });
