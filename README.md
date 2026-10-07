# KharidoNow

Light, responsive online clothing store with a customer shop and an admin panel for products, orders, categories, customers, reviews, and coupons.

PHP/WordPress is not required to run this project. It uses Node.js so it works on this machine without installing PHP, MySQL, or WordPress.

## Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Logins

- **Admin:** `admin@kharidonow.com` / `admin123` — [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Customer:** `user@kharidonow.com` / `user123`

## Store features

- Home, category shop, search, filters, product page
- Size/color, cart, coupons (`WELCOME10`, `FLAT200`), checkout (COD / demo UPI)
- Account, addresses, wishlist, reviews, order tracking
- Admin CRUD for catalog and order status updates

Data is saved in `data/store.json`.

## Extra store features

- Live search suggestions
- Shop pagination
- Delivery date estimate on product pages
- Recently viewed products
- Customer order cancel (Pending / Confirmed)
- Profile edit (name, phone, password)
