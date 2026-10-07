const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { slugify } = require('./helpers');

const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json');

let cache = null;

function now() {
  return new Date().toISOString();
}

function seed() {
  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('user123', 10);

  const categories = [
    { id: 'cat-men', name: 'Men', slug: 'men', image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&q=80' },
    { id: 'cat-women', name: 'Women', slug: 'women', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80' },
    { id: 'cat-kids', name: 'Kids', slug: 'kids', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&q=80' },
    { id: 'cat-ethnic', name: 'Ethnic Wear', slug: 'ethnic-wear', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80' },
    { id: 'cat-footwear', name: 'Footwear', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
    { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80' }
  ];

  const rawProducts = [
    {
      name: 'Classic White Oxford Shirt',
      categoryId: 'cat-men',
      brand: 'KharidoNow Essentials',
      price: 1299,
      comparePrice: 1999,
      stock: 42,
      gender: 'Men',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['White', 'Sky Blue'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900&q=80',
      description: 'Crisp cotton oxford shirt with a regular fit. Easy to pair with chinos or jeans for work and weekends.'
    },
    {
      name: 'Slim Fit Navy Chinos',
      categoryId: 'cat-men',
      brand: 'Urban Thread',
      price: 1599,
      comparePrice: 2499,
      stock: 35,
      gender: 'Men',
      sizes: ['30', '32', '34', '36', '38'],
      colors: ['Navy', 'Beige'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=900&q=80',
      description: 'Stretch cotton chinos with a slim silhouette and comfortable waistband for all-day wear.'
    },
    {
      name: 'Cotton Crew Neck T-Shirt',
      categoryId: 'cat-men',
      brand: 'KharidoNow Essentials',
      price: 499,
      comparePrice: 799,
      stock: 80,
      gender: 'Men',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'White', 'Olive'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80',
      description: 'Soft combed cotton tee with a clean crew neck. A daily essential for every wardrobe.'
    },
    {
      name: 'Washed Denim Jacket',
      categoryId: 'cat-men',
      brand: 'Denim Co.',
      price: 2499,
      comparePrice: 3499,
      stock: 18,
      gender: 'Men',
      sizes: ['M', 'L', 'XL'],
      colors: ['Indigo'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&q=80',
      description: 'Classic trucker jacket in washed indigo denim with metal buttons and twin chest pockets.'
    },
    {
      name: 'Formal Black Trousers',
      categoryId: 'cat-men',
      brand: 'Office Edit',
      price: 1799,
      comparePrice: 2599,
      stock: 28,
      gender: 'Men',
      sizes: ['30', '32', '34', '36'],
      colors: ['Black', 'Charcoal'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1594938291221-94f18cbbd0ef?w=900&q=80',
      description: 'Tailored formal trousers with a sharp crease and wrinkle-resistant blend.'
    },
    {
      name: 'Fleece Hooded Sweatshirt',
      categoryId: 'cat-men',
      brand: 'Comfort Lab',
      price: 1399,
      comparePrice: 2199,
      stock: 40,
      gender: 'Men',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Grey', 'Navy', 'Maroon'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&q=80',
      description: 'Brushed fleece hoodie with kangaroo pocket and ribbed cuffs. Warm without the bulk.'
    },
    {
      name: 'Floral Summer Dress',
      categoryId: 'cat-women',
      brand: 'Bloom',
      price: 1899,
      comparePrice: 2799,
      stock: 24,
      gender: 'Women',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Floral Pink', 'Floral Blue'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&q=80',
      description: 'Light chiffon dress with a flattering A-line cut. Perfect for brunches and summer evenings.'
    },
    {
      name: 'High-Waist Stretch Jeans',
      categoryId: 'cat-women',
      brand: 'Denim Co.',
      price: 1699,
      comparePrice: 2499,
      stock: 36,
      gender: 'Women',
      sizes: ['26', '28', '30', '32'],
      colors: ['Light Blue', 'Black'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=80',
      description: 'High-rise jeans with gentle stretch and a straight leg. Holds shape wash after wash.'
    },
    {
      name: 'Knit Open Cardigan',
      categoryId: 'cat-women',
      brand: 'SoftKnit',
      price: 1499,
      comparePrice: 2299,
      stock: 22,
      gender: 'Women',
      sizes: ['S', 'M', 'L'],
      colors: ['Cream', 'Dusty Rose'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=900&q=80',
      description: 'Lightweight open-front cardigan you can layer over dresses, tees, or office wear.'
    },
    {
      name: 'Everyday White Cotton Top',
      categoryId: 'cat-women',
      brand: 'KharidoNow Essentials',
      price: 799,
      comparePrice: 1299,
      stock: 50,
      gender: 'Women',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['White', 'Ivory'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=900&q=80',
      description: 'Breathable cotton top with a relaxed fit and neat round neck. A closet staple.'
    },
    {
      name: 'A-Line Midi Skirt',
      categoryId: 'cat-women',
      brand: 'Bloom',
      price: 1299,
      comparePrice: 1899,
      stock: 20,
      gender: 'Women',
      sizes: ['S', 'M', 'L'],
      colors: ['Black', 'Olive'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=900&q=80',
      description: 'Flowy midi skirt with a comfortable elastic waist and easy A-line drape.'
    },
    {
      name: 'Embroidered Cotton Kurta',
      categoryId: 'cat-ethnic',
      brand: 'Heritage Weave',
      price: 1599,
      comparePrice: 2399,
      stock: 30,
      gender: 'Women',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Mint', 'Peach'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&q=80',
      description: 'Hand-feel cotton kurta with subtle embroidery. Festive enough, everyday comfortable.'
    },
    {
      name: 'Men’s Linen Kurta Set',
      categoryId: 'cat-ethnic',
      brand: 'Heritage Weave',
      price: 2199,
      comparePrice: 3299,
      stock: 16,
      gender: 'Men',
      sizes: ['M', 'L', 'XL'],
      colors: ['Ivory', 'Sage'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=900&q=80',
      description: 'Breathable linen-blend kurta with matching pyjama. Ideal for celebrations and family gatherings.'
    },
    {
      name: 'Kids Graphic Cotton Tee',
      categoryId: 'cat-kids',
      brand: 'Little Loop',
      price: 399,
      comparePrice: 699,
      stock: 60,
      gender: 'Kids',
      sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'],
      colors: ['Yellow', 'Blue'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1503944583226-242c37a9c1de?w=900&q=80',
      description: 'Play-proof cotton tee with a cheerful print. Soft on skin and easy to wash.'
    },
    {
      name: 'Kids Cotton Shorts Set',
      categoryId: 'cat-kids',
      brand: 'Little Loop',
      price: 899,
      comparePrice: 1399,
      stock: 32,
      gender: 'Kids',
      sizes: ['3-4Y', '5-6Y', '7-8Y'],
      colors: ['Navy', 'Coral'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900&q=80',
      description: 'Matching tee and shorts set for warm days. Elastic waist and durable stitching.'
    },
    {
      name: 'Kids Hooded Zip Jacket',
      categoryId: 'cat-kids',
      brand: 'Little Loop',
      price: 1199,
      comparePrice: 1799,
      stock: 18,
      gender: 'Kids',
      sizes: ['5-6Y', '7-8Y', '9-10Y'],
      colors: ['Red', 'Navy'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1518831959646-4a9516ea0131?w=900&q=80',
      description: 'Light zip-up hoodie for school runs and playground evenings.'
    },
    {
      name: 'Canvas Low-Top Sneakers',
      categoryId: 'cat-footwear',
      brand: 'Stride',
      price: 1499,
      comparePrice: 2299,
      stock: 44,
      gender: 'Unisex',
      sizes: ['6', '7', '8', '9', '10'],
      colors: ['White', 'Black'],
      featured: true,
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
      description: 'Everyday canvas sneakers with cushioned insole and non-slip sole.'
    },
    {
      name: 'Minimal Leather Belt',
      categoryId: 'cat-accessories',
      brand: 'KharidoNow Essentials',
      price: 699,
      comparePrice: 999,
      stock: 55,
      gender: 'Men',
      sizes: ['32', '34', '36', '38'],
      colors: ['Brown', 'Black'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80',
      description: 'Genuine-look leather belt with a simple metal buckle. Finishes any outfit.'
    },
    {
      name: 'Cotton Baseball Cap',
      categoryId: 'cat-accessories',
      brand: 'Stride',
      price: 499,
      comparePrice: 799,
      stock: 70,
      gender: 'Unisex',
      sizes: ['Free Size'],
      colors: ['Black', 'Beige'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=900&q=80',
      description: 'Breathable cotton cap with an adjustable strap. Light shade for sunny days.'
    },
    {
      name: 'Soft Wool Blend Scarf',
      categoryId: 'cat-accessories',
      brand: 'SoftKnit',
      price: 899,
      comparePrice: 1499,
      stock: 26,
      gender: 'Unisex',
      sizes: ['Free Size'],
      colors: ['Camel', 'Grey'],
      featured: false,
      image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=900&q=80',
      description: 'Warm, non-itchy scarf with clean edges. A simple winter layer.'
    }
  ];

  const products = rawProducts.map((p, i) => ({
    id: 'p-' + (i + 1),
    sku: 'KN' + String(1000 + i),
    slug: slugify(p.name),
    ratingAvg: 4.2 + ((i * 7) % 8) / 10,
    ratingCount: 12 + (i * 9) % 80,
    createdAt: now(),
    ...p
  }));

  const users = [
    {
      id: 'u-admin',
      name: 'Store Admin',
      email: 'admin@kharidonow.com',
      phone: '9000000000',
      password: adminPass,
      role: 'admin',
      createdAt: now()
    },
    {
      id: 'u-demo',
      name: 'Aarav Sharma',
      email: 'user@kharidonow.com',
      phone: '9876543210',
      password: userPass,
      role: 'customer',
      createdAt: now()
    }
  ];

  const addresses = [
    {
      id: 'a-1',
      userId: 'u-demo',
      name: 'Aarav Sharma',
      phone: '9876543210',
      line1: '221, Green Park',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110016',
      isDefault: true
    }
  ];

  const reviews = [
    { id: uuid(), productId: 'p-1', userId: 'u-demo', userName: 'Aarav Sharma', rating: 5, comment: 'Fabric feels premium and the fit is true to size.', createdAt: now() },
    { id: uuid(), productId: 'p-7', userId: 'u-demo', userName: 'Aarav Sharma', rating: 4, comment: 'Beautiful print. Slightly long, but lovely for summer.', createdAt: now() }
  ];

  const coupons = [
    { id: 'c-1', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 999, active: true },
    { id: 'c-2', code: 'FLAT200', type: 'flat', value: 200, minOrder: 1499, active: true }
  ];

  const sampleOrder = {
    id: 'o-1',
    orderNo: 'KN10000001',
    userId: 'u-demo',
    status: 'Shipped',
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    subtotal: 1299,
    discount: 0,
    shipping: 0,
    total: 1299,
    address: addresses[0],
    items: [
      { productId: 'p-1', name: 'Classic White Oxford Shirt', price: 1299, qty: 1, size: 'M', color: 'White', image: products[0].image }
    ],
    timeline: [
      { status: 'Pending', at: now() },
      { status: 'Confirmed', at: now() },
      { status: 'Packed', at: now() },
      { status: 'Shipped', at: now() }
    ],
    createdAt: now()
  };

  return {
    users,
    addresses,
    categories,
    products,
    orders: [sampleOrder],
    reviews,
    coupons,
    wishlists: [{ userId: 'u-demo', productIds: ['p-7'] }]
  };
}

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DATA_FILE)) {
    cache = seed();
    save();
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return cache;
}

function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

function db() {
  return load();
}

module.exports = { db, save, load };
