# Aura Mosaic Store

Aura Mosaic is a React + Express + MongoDB e-commerce application for curated lifestyle products. This cleaned version uses one frontend, one backend, one API contract, server-authoritative checkout totals, authenticated wishlists/orders, and protected admin mutations.

## Architecture

```text
Aura-Mosaic Store/
├── client/                  React storefront (Create React App)
│   ├── public/
│   └── src/
│       ├── api/             Single Axios API client
│       ├── components/
│       ├── pages/
│       └── utils/
├── server/                  Express + MongoDB API
│   ├── data/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── utils/
├── .gitignore
└── package.json
```

The old duplicate `Backend/` server, standalone `client/api/` server, old auth/listing/modal implementations, obsolete AI route, and unused assets/dependencies were removed.

## Current features

- Email/password registration and login
- Google ID-token login
- JWT-protected user routes
- User profile completion
- MongoDB-backed wishlist for signed-in users
- Product/category browsing, search, filtering, sorting and pagination
- Product details, related products and recently viewed products
- Reviews with ownership checks and verified-purchase status
- Deterministic shopping recommendations, gift recommendations and product comparison
- Local cart with server-authoritative order creation
- Cash on Delivery checkout
- Order history and payment transaction history
- Admin-only product/category/order/contact/newsletter operations
- Contact form persistence
- Newsletter subscription persistence
- Bangladesh delivery-city list
- Responsive SPA routing and Vercel SPA fallback configuration

## Requirements

- Node.js 18+ recommended
- npm
- MongoDB Atlas or another MongoDB deployment that supports transactions/replica sets
- Google OAuth client ID if Google sign-in is enabled

## Local setup

### 1. Install dependencies

From the project root:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Configure the backend

Copy:

```bash
server/.env.example -> server/.env
```

Set at least:

```env
PORT=4000
CONNECTION_STRING=mongodb+srv://...
JWT_SECRET=use_a_long_random_secret
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_ORIGINS=http://localhost:3000
RATE_LIMIT_PER_MINUTE=180
```

`GOOGLE_CLIENT_ID_ALT` is optional. `CLIENT_ORIGINS` can be a comma-separated list in production.

### 3. Configure the frontend

Copy:

```bash
client/.env.example -> client/.env
```

For local development, the default is:

```env
REACT_APP_API_BASE_URL=/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

Create React App proxies `/api` to `http://localhost:4000` during local development.

### 4. Run the app

In one terminal:

```bash
npm run server
```

In another:

```bash
npm run client
```

The storefront runs at `http://localhost:3000` and the API at `http://localhost:4000` by default.

## Production configuration

The frontend must receive the public backend URL at build time:

```env
REACT_APP_API_BASE_URL=https://api.example.com/api
REACT_APP_GOOGLE_CLIENT_ID=...
```

The backend should use:

```env
NODE_ENV=production
CONNECTION_STRING=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
CLIENT_ORIGINS=https://shop.example.com
PORT=4000
```

Do not commit `.env` files. Only `.env.example` files belong in source control.

### Vercel frontend

Deploy the `client/` directory as the Vercel project root. Build command:

```bash
npm run build
```

Output directory:

```text
build
```

`client/vercel.json` preserves client-side React Router URLs on refresh.

### Backend hosting

Deploy `server/` to a Node-compatible host. Start command:

```bash
npm start
```

Set `CLIENT_ORIGINS` to the final frontend origin and set the frontend `REACT_APP_API_BASE_URL` to the deployed backend `/api` URL.

## Creating an admin account

All new accounts are customers by default. Register the intended admin account normally, then run the one-time promotion script from the root:

```bash
ADMIN_EMAIL=owner@example.com npm --prefix server run admin:promote
```

On Windows PowerShell:

```powershell
$env:ADMIN_EMAIL="owner@example.com"
npm --prefix server run admin:promote
```

The script uses `server/.env` for `CONNECTION_STRING` and only promotes an account that already exists.

## API overview

Public routes include:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/search`
- `GET /api/products/:id`
- `GET /api/products/:id/reviews`
- `GET /api/cities`
- `POST /api/recommendations/chat`
- `POST /api/recommendations/recommend`
- `POST /api/recommendations/gift`
- `POST /api/recommendations/compare`
- `POST /api/contact`
- `POST /api/newsletter/subscribe`

Authenticated customer routes include:

- `GET /api/auth/me`
- `PATCH /api/users/me`
- `GET/POST/DELETE /api/users/me/wishlist...`
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `GET /api/transactions/my`
- review creation/deletion routes

Admin routes include product/category mutations, all-order listing/status updates, all-transactions listing, contact-message listing, and newsletter-subscriber listing.

## Order and payment model

Checkout is intentionally **Cash on Delivery only** in this version. The frontend cannot declare an order paid.

The server:

1. Loads the current products from MongoDB.
2. Recalculates item prices and quantities.
3. Validates stock.
4. Calculates subtotal, shipping and total.
5. Atomically decrements inventory and creates the order.
6. Creates a paid transaction only when an admin advances a COD order to `delivered`.
7. Restores inventory once if an eligible order is cancelled.

Supported order transitions are:

```text
pending -> confirmed -> processing -> shipped -> delivered
   |           |             |
   +-----------+-------------+-> cancelled (before shipment)
```

Online methods such as bKash, Nagad or card should only be enabled after integrating a real provider callback/webhook and verifying payment on the server.

## Search and recommendations

`/api/products/search` supports the query text plus category, brands, price range, rating, stock, sorting, and pagination.

The Shopping Assistant, Gifting Studio, and Smart Compare are currently deterministic recommendation features backed by MongoDB product data. They do not call an external LLM. This keeps the behavior predictable and removes the previous unused Hugging Face/OpenAI branches.

## Security notes

The API now includes:

- Server-side JWT verification
- Database-backed role checks for admin actions
- CORS allow-list support
- Security headers
- Request body size limits
- Basic per-IP rate limiting
- Input validation and ObjectId validation
- Password hashing
- Ownership checks for private resources
- Server-authoritative pricing and stock updates
- Centralized API error handling

The included rate limiter is process-local. For horizontally scaled production deployments, replace it with a shared store such as Redis.

## Validation commands

Backend JavaScript syntax:

```bash
npm run check:server
```

Frontend production build:

```bash
npm run build
```

Run the production build after installing dependencies on the deployment machine or CI environment.

## Important credential note

Never reuse or publish credentials from an older copy of this project. If a previous archive, repository, chat attachment, or deployment contained a real MongoDB URI, JWT secret, Google secret, Hugging Face token, or other credential, rotate/revoke that credential and configure a fresh value through environment variables.
