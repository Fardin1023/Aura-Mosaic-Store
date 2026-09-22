# Aura Mosaic cleanup notes

This file summarizes the major changes made while consolidating the original project.

## Removed

- Duplicate top-level `Backend/` application.
- Duplicate `client/api/` Express city server.
- Old Hugging Face `/api/chat` route and unused external-LLM dependency path.
- Singular/duplicate category API implementation.
- In-memory JWT blacklist.
- Old standalone login/register pages.
- Old listing/search/category pages superseded by the unified product listing.
- Old product modal, unused recommendations component, old cart context and old sidebar/home-category branches.
- Unused logo/banner variants and dependencies that only supported deleted code.
- Checked-in `.env` files from the working copy.
- Fake client-side successful-order fallback and client-declared paid payment state.
- Gifting discounts that were advertised but not enforced at checkout.

## Replaced

- Multiple API hosts/ports -> one configurable `/api` client and one Express server.
- Browser-only wishlist -> authenticated MongoDB wishlist.
- Fragmented product/category calls -> REST-style `/api/products` and `/api/categories` routes.
- Broken search autocomplete -> `/api/products/search?q=...` with filters/facets/pagination.
- Duplicate gifting logic -> `/api/recommendations/gift` as the recommendation source of truth.
- Fake payment success -> COD-only checkout until a real provider verifies online payments.
- Client-calculated order authority -> server-calculated prices, shipping, totals and stock validation.
- Unprotected catalog mutations -> database-backed admin authorization.
- Static Contact/Newsletter UI -> persisted API submissions.

## Added

- Central API error handling and 404 responses.
- CORS allow-list support, security headers, request limits and basic rate limiting.
- Role-aware users and a one-time admin promotion script.
- Protected order status transitions with stock restoration on cancellation.
- Server-created transaction records for delivered COD orders.
- Recently viewed products.
- Refresh-safe order confirmation retrieval.
- Centralized authenticated wishlist operations.
- Static Bangladesh delivery location API.
- `.env.example` files and root `.gitignore`.
- Vercel SPA routing config for the frontend.
- Production/local setup documentation in the root README.

## External work intentionally not faked

A real bKash/Nagad/card gateway was not fabricated without provider credentials and callback/webhook configuration. Online payment options remain disabled. Contact messages and newsletter subscriptions are stored in MongoDB; sending email/newsletter campaigns requires an external provider if desired.
