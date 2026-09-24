<p align="center">
  <img src="client/src/assets/images/aura-mosaic-logo.png" alt="Aura-Mosaic logo" width="360" />
</p>

<h1 align="center">Aura-Mosaic</h1>

<p align="center">
  A full-stack, AI-assisted e-commerce platform for curated gifts, beauty, skincare and lifestyle products — with a customer storefront, admin operations suite, inventory-aware AI recommendations, and production deployment.
</p>

<p align="center">
  <a href="https://aura-mosaic-store.vercel.app/"><strong>Live Demo</strong></a>
  ·
  <a href="https://aura-mosaic-store.onrender.com/api/health"><strong>API Health</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js + Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB Atlas" />
  <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Cloudinary-Media-3448C5?logo=cloudinary&logoColor=white" alt="Cloudinary" />
  <img src="https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Render-Backend-46E3B7?logo=render&logoColor=111111" alt="Render" />
</p>

---

## Overview

**Aura-Mosaic** is a production-deployed MERN-style e-commerce application built around two experiences:

1. **Customer storefront** — product discovery, search, account management, wishlist, cart, COD checkout, reviews, AI shopping assistance and AI-generated gift bundles.
2. **Admin workspace** — product/catalog management, Cloudinary image uploads, inventory control, customer/order management, analytics, review moderation, contact/newsletter operations and store settings.

A major design goal is to keep business-critical facts **server-authoritative**. Product price, stock, orders, permissions and AI-recommended product IDs are validated by the Express/MongoDB backend instead of trusting browser state or model output.

### Project status

| Area | Status |
| --- | --- |
| Storefront | ✅ Deployed |
| Backend API | ✅ Deployed |
| MongoDB persistence | ✅ Live |
| Authentication / RBAC | ✅ Implemented |
| Admin dashboard | ✅ Implemented |
| Product & inventory management | ✅ Implemented |
| Cloudinary image management | ✅ Implemented |
| Gemini shopping assistant | ✅ Implemented |
| AI Gift Studio | ✅ Implemented |
| COD checkout | ✅ Functional |
| bKash / Nagad / card UI | 🟡 Displayed as **Coming Soon** |
| Production frontend | ✅ Vercel |
| Production backend | ✅ Render |

> **Payment note:** Cash on Delivery is the only active payment method in the current release. bKash, Nagad, Visa, Mastercard and debit/credit-card options are intentionally shown as upcoming methods; no fake online-payment success flow is used.

---

## Live deployment

- **Frontend:** https://aura-mosaic-store.vercel.app/
- **Backend:** https://aura-mosaic-store.onrender.com
- **Health check:** https://aura-mosaic-store.onrender.com/api/health

The deployed architecture uses:

- **Vercel** — React SPA
- **Render** — Node/Express API
- **MongoDB Atlas** — application data
- **Cloudinary** — product media
- **Google Gemini API** — AI shopping/gifting features

---

## Key features

### Customer experience

- Responsive storefront with two persistent visual themes
- Animated premium UI for desktop, tablet and mobile
- Product/category browsing
- Search with filtering, sorting and pagination
- Product details, related products and reviews
- Animated product **Quick View**
- Wishlist persisted to MongoDB
- Auth-gated cart and purchase actions
- Animated guest sign-in/register gate
- Quantity controls and server-authoritative checkout totals
- Bangladesh delivery-city selection
- Cash on Delivery checkout
- Order confirmation and order history
- Customer profile editing
- Password change for local accounts
- Order cancellation when the order is still eligible
- Theme-aware authentication UI with password visibility controls
- Contact form and newsletter subscription

### Aura AI

Aura-Mosaic includes three AI-facing customer experiences:

#### Aura AI Studio
Natural-language shopping assistance using the live catalog.

Example prompts:

```text
Find me the best value skincare products under Tk 1500.
Recommend something for my home that is currently in stock.
Use my wishlist and recent purchases to suggest my next buy.
```

#### AI Gift Studio
Creates real gift plans from natural-language prompts.

```text
Make a thoughtful birthday gift for my sister under Tk 2000.
```

A generated plan can include:

- bundle title/theme
- explanation of why it fits
- 1–4 actual store products
- live total price
- gift-card message
- add-one or add-entire-bundle actions

#### Aura Assistant
A floating multi-turn shopping assistant capable of:

- product discovery
- comparisons
- cheaper alternatives
- gift suggestions
- wishlist-aware suggestions
- recent-purchase context
- order/status questions
- store FAQ responses
- product actions from chat

### AI grounding and resilience

Gemini is used for reasoning, but it is **not** treated as the source of truth for catalog data.

The server:

1. loads active/in-stock products from MongoDB;
2. gives the model bounded catalog context;
3. parses the model response;
4. validates every returned product ID against MongoDB;
5. re-checks budget constraints for gift plans;
6. falls back to deterministic live-catalog recommendations if the AI provider is slow or unavailable.

This prevents the UI from displaying invented products, prices or stock information.

---

## Admin dashboard

Admin accounts have a protected operational dashboard with role-based access control.

### Overview & analytics

- total products
- total customers
- total orders
- pending orders
- revenue
- low-stock products
- recent orders
- best-selling products
- order-status visualization
- inventory-health visualization

### Catalog management

- create/edit/archive/restore products
- SKU, brand, vendor, tags and pricing
- featured products
- stock levels
- categories and subcategories
- Cloudinary product-image upload
- image deletion/cleanup
- product review moderation

### Inventory operations

- manual stock adjustments
- restock/correction reasons
- before/after inventory values
- low-stock tracking
- inventory movement audit trail
- automatic restoration when eligible orders are cancelled

### Order operations

- customer/order lookup
- server-calculated totals
- status transitions
- tracking number
- admin notes
- status history
- cancellation handling
- inventory restoration protection

### Customer & store operations

- customer list/search
- customer order history
- activate/deactivate accounts
- contact-message management
- newsletter subscriber management
- store settings
- shipping fee and free-shipping threshold
- low-stock threshold
- COD enable/disable
- support contact details
- announcement text

---

## Authentication and authorization

Aura-Mosaic supports:

- email/password registration
- bcrypt password hashing
- JWT authentication
- optional Google ID-token login
- `customer` and `admin` roles
- protected user resources
- protected admin mutations
- account/profile management

Guests can browse public products, but account-required actions such as cart, wishlist, gifting, AI Studio and purchase flows are blocked by a centralized animated authentication gate.

> The frontend gate improves UX; the backend authentication/authorization middleware remains the actual security boundary.

---

## System architecture

```mermaid
flowchart TB
    U[Customer / Admin Browser]

    subgraph FE[React SPA · Vercel]
      UI[Storefront + Admin UI]
      CTX[Auth / Cart / Theme Context]
      API[Axios API Client]
      AIUI[Aura AI Studio\nGift Studio\nAura Assistant]
    end

    subgraph BE[Express API · Render]
      APP[Express App]
      AUTH[JWT + Role Middleware]
      ROUTES[REST Route Modules]
      AISVC[Gemini AI Services]
      MEDIA[Cloudinary Signing Utility]
      SEC[CORS · Security Headers\nRate Limit · Validation]
    end

    DB[(MongoDB Atlas)]
    GEMINI[Google Gemini API]
    CLOUD[Cloudinary]
    GOOGLE[Google OAuth\noptional]

    U --> UI
    UI --> CTX
    UI --> AIUI
    CTX --> API
    AIUI --> API
    API --> APP
    APP --> SEC
    SEC --> AUTH
    AUTH --> ROUTES
    ROUTES --> DB
    ROUTES --> AISVC
    AISVC --> DB
    AISVC --> GEMINI
    ROUTES --> MEDIA
    MEDIA --> CLOUD
    APP -. optional .-> GOOGLE
```

### Request flow

```text
React UI
   ↓
Axios API client
   ↓
Express route
   ↓
Security + authentication + role checks
   ↓
Validation/business logic
   ↓
MongoDB / Gemini / Cloudinary
   ↓
Validated JSON response
   ↓
React state + UI
```

---

## Order lifecycle

```mermaid
flowchart LR
    P[Pending] --> C[Confirmed]
    C --> PR[Processing]
    PR --> S[Shipped]
    S --> D[Delivered]

    P --> X[Cancelled]
    C --> X
    PR --> X
```

For checkout, the server reloads product records from MongoDB, validates quantities/stock, recalculates totals and updates inventory. Client-side prices are not accepted as authoritative order totals.

Current production checkout uses **Cash on Delivery**. Online-payment methods shown in the UI are non-functional placeholders for a future verified payment-gateway integration.

---

## Repository structure

```text
Aura-Mosaic-Store/
├── client/                         # React storefront + admin SPA
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js             # Central Axios/API layer
│   │   ├── assets/
│   │   │   └── images/            # Logo, banners and UI assets
│   │   ├── components/
│   │   │   ├── ChatBot/
│   │   │   ├── CityDropdown/
│   │   │   ├── Footer/
│   │   │   ├── Header/
│   │   │   ├── HomeBanner/
│   │   │   ├── ProductItem/
│   │   │   ├── ProductZoom/
│   │   │   └── QuantityBox/
│   │   ├── pages/
│   │   │   ├── AdminDashboard/
│   │   │   ├── AIStudio/
│   │   │   ├── Auth/
│   │   │   ├── Cart/
│   │   │   ├── CompleteProfile/
│   │   │   ├── Gifting/
│   │   │   ├── History/
│   │   │   ├── Home/
│   │   │   ├── OrderConfirmation/
│   │   │   ├── ProductDetails/
│   │   │   ├── ProductListing/
│   │   │   └── Wishlist/
│   │   ├── App.js                 # Routes + shared customer state
│   │   └── App.css                # Theme/design system + responsive UI
│   ├── .env.example
│   ├── package.json
│   └── vercel.json                # SPA rewrite for React Router
│
├── server/                         # Express REST API
│   ├── data/
│   │   └── cities.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── adminMiddleware.js
│   │   ├── optionalAuth.js
│   │   ├── security.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── category.js
│   │   ├── contactMessage.js
│   │   ├── inventoryMovement.js
│   │   ├── newsletterSubscriber.js
│   │   ├── order.js
│   │   ├── products.js
│   │   ├── storeSetting.js
│   │   ├── transaction.js
│   │   └── user.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── categories.js
│   │   ├── cities.js
│   │   ├── contact.js
│   │   ├── newsletter.js
│   │   ├── orders.js
│   │   ├── products.js
│   │   ├── recommendations.js
│   │   ├── transactions.js
│   │   └── users.js
│   ├── services/
│   │   ├── aiAdvisor.js
│   │   └── assistantV2.js
│   ├── scripts/
│   │   └── promote-admin.js
│   ├── utils/
│   │   ├── cloudinary.js
│   │   └── validation.js
│   ├── app.js
│   ├── .env.example
│   └── package.json
│
├── package.json                    # Root convenience scripts
└── README.md
```

---

## Data model overview

### User

Stores account identity and customer profile information:

- name/email
- local or Google auth provider
- role (`customer` / `admin`)
- active state
- phone/address/city/postal code
- profile image
- profile completion state
- wishlist references

### Product

- name / SKU
- description / additional information
- images
- brand / vendor
- tags
- current and old price
- category / subcategory
- stock count
- rating / reviews
- featured state
- active/archive state

### Order

- user
- immutable order-item snapshots
- subtotal / shipping / discount / total
- shipping address
- payment metadata
- order status
- tracking number
- admin note
- status history
- inventory-restoration guard

### Inventory movement

Captures manual admin inventory changes with:

- product/admin references
- change type
- delta
- before/after values
- reason

### Store settings

- store name
- currency
- flat shipping fee
- free-shipping threshold
- low-stock threshold
- COD availability
- support email/phone
- announcement

Additional collections support categories, transactions, newsletter subscribers and customer contact messages.

---

## API overview

Base URL locally:

```text
http://localhost:4000/api
```

Production:

```text
https://aura-mosaic-store.onrender.com/api
```

### Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/google
GET  /auth/me
POST /auth/logout
```

### Users

```text
PATCH  /users/me
PATCH  /users/me/password
DELETE /users/me
GET    /users/me/wishlist
POST   /users/me/wishlist/:productId
DELETE /users/me/wishlist/:productId
```

Admin customer endpoints are also available under `/users/admin/...`.

### Products

```text
GET  /products
GET  /products/search
GET  /products/featured/:count
GET  /products/related/:categoryId/:excludeId
GET  /products/:id
GET  /products/:id/reviews
POST /products/:id/reviews
```

Admin product endpoints add catalog CRUD, review moderation, image-upload signatures and inventory operations.

### Categories

Public reads plus admin-protected category/subcategory creation, update and deletion.

### Orders

```text
GET   /orders/store-settings
POST  /orders
GET   /orders/my
GET   /orders/:id
PATCH /orders/:id/cancel
```

Admin endpoints provide dashboard analytics, all-order management, status updates and store-setting management.

### AI / recommendations

The recommendation API contains endpoints for:

- shopping advice
- chat assistant
- recommendations
- comparisons
- gifting
- AI gift designer

All product-facing AI results are checked against the live MongoDB catalog before being returned to the browser.

### Operations

- contact messages
- newsletter subscriptions
- transaction history
- store settings
- Bangladesh city list

---

## Technology stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React 19 | SPA UI |
| React Router | Client-side routing |
| Axios | API communication |
| Material UI | Selected controls/dialog primitives |
| React Icons | Icon system |
| SweetAlert2 | Alerts/auth gates |
| Swiper / React Slick | Carousel interactions |
| React Markdown | Rich assistant output |
| CSS | Custom responsive design system and themes |

### Backend

| Technology | Purpose |
| --- | --- |
| Node.js | Server runtime |
| Express | REST API |
| MongoDB Atlas | Database hosting |
| Mongoose | ODM / schemas |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| Google Auth Library | Optional Google login verification |
| Gemini API | AI reasoning |
| Cloudinary | Product media storage |

### Deployment

| Service | Role |
| --- | --- |
| Vercel | React frontend |
| Render | Express backend |
| MongoDB Atlas | Production database |
| Cloudinary | Product image CDN/storage |
| Google AI | Gemini API |

---

## Security and integrity decisions

The backend includes several defensive controls:

- JWT verification on authenticated routes
- database-backed admin-role checks
- bcrypt password hashing
- CORS origin allowlist
- security headers
- body-size limits
- per-IP rate limiting
- ObjectId/input validation
- centralized API error handling
- ownership checks for private resources
- server-side stock validation
- server-authoritative pricing/order totals
- review ownership/moderation rules
- AI product-ID verification against MongoDB

The included rate limiter is process-local. A horizontally scaled production version should move rate-limit state to a shared store such as Redis.

---

## Local development

### Requirements

- **Node.js 18+**
- npm
- MongoDB Atlas (or compatible MongoDB deployment)
- Cloudinary account for admin image uploads
- Gemini API key for AI functionality
- Google OAuth client ID only if Google login is enabled

### 1. Clone the repository

```bash
git clone https://github.com/Fardin1023/Aura-Mosaic-Store.git
cd Aura-Mosaic-Store
```

### 2. Install dependencies

```bash
npm --prefix server install
npm --prefix client install
```

### 3. Configure the backend

Create:

```text
server/.env
```

Example:

```env
PORT=4000
NODE_ENV=development

CONNECTION_STRING=mongodb+srv://USERNAME:PASSWORD@HOST/aurashopDatabase?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_ORIGINS=http://localhost:3000
RATE_LIMIT_PER_MINUTE=180

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-3.5-flash
GEMINI_TIMEOUT_MS=65000
GEMINI_RETRY_ATTEMPTS=1

# Optional
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_ID_ALT=
```

### 4. Configure the frontend

Create:

```text
client/.env
```

For local development:

```env
REACT_APP_API_BASE_URL=/api

# Optional
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

`client/package.json` proxies `/api` to `http://localhost:4000` during local development.

### 5. Run both applications

Backend:

```bash
npm run server
```

Frontend:

```bash
npm run client
```

Open:

```text
http://localhost:3000
```

API health check:

```text
http://localhost:4000/api/health
```

---

## Creating an admin

New registrations default to the `customer` role.

Register the intended admin account first, then run:

### macOS / Linux

```bash
ADMIN_EMAIL=owner@example.com npm --prefix server run admin:promote
```

### PowerShell

```powershell
$env:ADMIN_EMAIL="owner@example.com"
npm --prefix server run admin:promote
```

The script promotes an existing user; it does not create a separate hard-coded admin account.

---

## Useful commands

```bash
# Start backend in development mode
npm run server

# Start React client
npm run client

# Build production frontend
npm run build

# Backend JS syntax checks
npm run check:server

# Promote an existing user to admin
npm --prefix server run admin:promote
```

---

## Production environment

### Vercel (`client/`)

```text
Root directory: client
Build command:  npm run build
Output:         build
```

Required frontend environment variable:

```env
REACT_APP_API_BASE_URL=https://aura-mosaic-store.onrender.com/api
```

`client/vercel.json` rewrites SPA routes to `index.html`, so routes such as `/admin`, `/history`, `/gifting` and `/product/:id` continue to work on page refresh.

### Render (`server/`)

```text
Root directory: server
Build command:  npm install
Start command:  node app.js
```

Production variables include:

```env
NODE_ENV=production
CONNECTION_STRING=...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
CLIENT_ORIGINS=https://aura-mosaic-store.vercel.app
RATE_LIMIT_PER_MINUTE=180

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-3.5-flash
GEMINI_TIMEOUT_MS=65000
GEMINI_RETRY_ATTEMPTS=1
```

Do not hard-code Render's `PORT`; the platform supplies it.

---

## Validation before a release

Recommended smoke-test flow:

```text
Register / Login
      ↓
Edit Profile
      ↓
Browse / Search
      ↓
Wishlist
      ↓
Add to Cart
      ↓
COD Checkout
      ↓
Order Confirmation
      ↓
My Account / Order History
      ↓
Admin verifies and updates order
```

AI smoke test:

```text
Aura AI Studio → recommendation → real product → Add to Cart
AI Gift Studio → prompt → gift plan → Add bundle to Cart
Aura Assistant → follow-up conversation → product action
```

Build/check commands:

```bash
npm run check:server
npm run build
```

---

## Notable engineering decisions

### 1. AI is grounded, not trusted blindly

The language model handles reasoning and natural-language generation. MongoDB remains the source of truth for product existence, pricing and stock.

### 2. Checkout is server-authoritative

The backend reloads products and calculates totals rather than accepting browser-provided totals.

### 3. Admin operations are part of the same product

The project is not only a storefront mockup; inventory, orders, customers and operational data can be managed from a protected admin interface.

### 4. Media credentials stay server-side

Cloudinary uploads use server-generated signatures rather than exposing the Cloudinary API secret in React.

### 5. Account-required commerce actions are centralized

Guest users can browse, but purchase-related actions are intercepted centrally by the application auth gate, minimizing inconsistent button behavior across product cards, quick views, AI results and other surfaces.

### 6. Deployment mirrors a real split frontend/backend architecture

The React client and Express API are deployed independently, connected through environment variables and a production CORS allowlist.

---

## Current limitations / roadmap

The following are intentionally outside the current release rather than hidden behind fake functionality:

- **Online payment processing:** bKash, Nagad and card options are UI-only/Coming Soon. A production version should use a real payment provider and server-side callback/webhook verification.
- **Password-reset email:** the account UI exposes recovery/support paths, but a transactional email provider is still required for a complete reset-token flow.
- **Newsletter campaigns:** subscription data is managed, but campaign delivery requires an email provider.
- **Horizontal scaling:** the current in-process rate limiter should move to Redis or another shared store when multiple API instances are introduced.

Possible next improvements:

- transactional email (Resend / SendGrid / SES)
- verified bKash/Nagad/card gateway
- Redis caching/rate limiting
- automated integration tests
- CI/CD quality gates
- product analytics/event tracking
- custom domain and production monitoring

---

## Environment-variable safety

Never commit real secrets.

Keep these private:

- MongoDB connection URI
- JWT secret
- Cloudinary API secret
- Gemini API key
- Google OAuth credentials

Only `.env.example` files should be committed.

If credentials were ever committed to Git history or exposed publicly, rotate them instead of simply deleting them from the latest commit.

---

## What this project demonstrates

For recruiters and developers, Aura-Mosaic demonstrates experience across the complete application lifecycle:

- product-oriented UI/UX design
- React SPA architecture
- REST API design
- MongoDB data modeling
- authentication and RBAC
- inventory/order consistency
- admin tooling
- AI integration with grounding and fallbacks
- third-party media integration
- responsive design
- security controls
- production deployment
- environment and CORS configuration
- debugging across local and cloud environments

---

## Author

**Fardin1023**

GitHub: https://github.com/Fardin1023

---

<p align="center">
  Built as a full-stack e-commerce + AI engineering project.
</p>
