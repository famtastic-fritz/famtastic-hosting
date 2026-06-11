# FAMtastic Hosting — Deploy State Capture
**Updated:** 2026-06-11 (cart + admin CMS + GoDaddy shopper stream deployed; git/deploy contract clarified)

## Source of Truth + Preflight

- **Canonical GitHub repo:** `git@github.com:famtastic-fritz/famtastic-hosting.git`
- **Canonical local checkout:** `~/famtastic/famtastic-sites/famtastic-hosting/`
- **Known duplicate checkout:** `~/famtastic/famtastic-hosting/` — do not use this as deploy truth unless you intentionally resync it first

Preflight before any GoDaddy deploy:

```bash
cd ~/famtastic/famtastic-sites/famtastic-hosting
git status --short --branch
git fetch origin
git rev-list --left-right --count origin/main...HEAD
```

Expected state before deploy:
- correct checkout path
- branch `main`
- remote `origin`
- ahead/behind `0 0` unless you intentionally have new local commits to push
- clean working tree

Lesson captured 2026-06-11:
- this project had two local checkouts; one stale checkout had no remote configured and created deployment confusion
- the canonical repo under `famtastic-sites/` was clean and fully synced to GitHub
- future GoDaddy deploys should always start by verifying the checkout path and git sync state before touching the server

## What's DONE

1. **Site built & deployed** — Astro SSR (hybrid) on GoDaddy cPanel
   - Local repo: `~/famtastic/famtastic-sites/famtastic-hosting/`
   - Server docroot: `/home/nineoo/public_html/famtastichosting.com/`
   - Site serves on **HTTPS** at `https://famtastichosting.com` — 200 OK

2. **SSL cert live** — Let's Encrypt, expires 2026-09-08

3. **MySQL database** — 18 products seeded, users + sessions + orders tables
   - DB: `FAMtastic Hosting` @ `localhost:3306`, user: `ShayShayDbAdmin`
   - Sessions table schema: `session_id` (varchar 128), `expires` (int unix ts), `data` (JSON `{user_id}`)
   - Users table: id, email, password_hash, role (customer|admin), godaddy_shopper_id, created_at

4. **Auth system LIVE** (all three routes fully wired)
   - `POST /api/auth/register` — bcrypt hash, session create, cookie set
   - `POST /api/auth/login` — timing-attack-safe verify, session, cookie
   - `POST /api/auth/logout` — DB session delete, cookie clear
   - `POST /api/auth/admin/login` — bcrypt via verifyPassword(), role check, session
   - Cookie: `fam_session` (httpOnly, Secure, SameSite=Strict)
   - Rate limiting: in-memory, 5 attempts/min window

5. **Customer APIs LIVE**
   - `GET /api/customer/dashboard` — subscriptions + product names
   - `GET /api/customer/products` — 18 active products with retail pricing
   - `GET /api/customer/billing` — order history via GoDaddy (shopper_id gated)
   - `GET /api/customer/domains` — domain list (shopper_id gated)
   - `GET /api/customer/hosting` — hosting plans from order history (shopper_id gated)

6. **Purchase flow LIVE**
   - `POST /api/orders/create` — auth-required, creates order in DB with pending status
     - Reads retail_price_cents from products table
     - Inserts with placeholder `godaddy_order_id = "FAM-<uuid>"` pending real provisioning
     - Returns order id, product name, total in USD

7. **Admin APIs LIVE**
   - `GET /api/admin/products` — full product catalog (wholesale + retail pricing)
   - `POST /api/admin/products` — insert new product (godaddy_product_id, name, category, prices, billing_period)
   - `GET /api/admin/customers` — customer list with order count + total spend
   - `GET /api/admin/orders` — orders via GoDaddy API
   - `POST /api/orders/postback` — GoDaddy webhook receiver (validates secret, updates DB)
   - Admin CMS product + content editor pages live (browser-facing UI not smoke-tested)

8. **Shopping cart LIVE** (guest session persistence)
   - `GET /api/cart` — current cart (items, count, subtotalUSD) — returns `{"items":[],"count":0,"subtotalUSD":"$0.00"}` for new guest
   - `POST /api/cart/add` — add item by product id + quantity
   - `POST /api/cart/update` — update item quantity
   - `POST /api/cart/clear` — empty the cart
   - Guest session token via cookie; cart stored server-side
   - `CartButton.svelte` + `CartDrawer.svelte` components wired into Nav
   - Pricing pages (hosting, domains, servers, wordpress) have Add to Cart UI

9. **GoDaddy shopper integration WIRED** (non-blocking)
   - `POST /api/auth/register` now fires `createShopper(email)` after DB INSERT
   - On success: `UPDATE users SET godaddy_shopper_id = ?` — links shopper to user
   - On failure: logs warning, registration succeeds regardless
   - GoDaddy order APIs (`src/lib/godaddy/orders.ts`) in place for provisioning hookup

10. **Admin user seeded**
   - Email: `admin@famtastichosting.com`
   - Password: stored in cPanel MySQL (not in repo)
   - Role: `admin`

11. **Node.js server**
   - Binary: `/home/nineoo/.nvm/versions/node/v20.20.2/bin/node`
   - Serves from: `/home/nineoo/public_html/famtastichosting.com/site/dist/server/entry.mjs`
   - Port: 3001 (127.0.0.1 only, Apache proxies via proxy.php)
   - Start script: `/home/nineoo/public_html/famtastichosting.com/start.sh`
   - Log: `/tmp/famhosting-node.log`
   - Deploy contract is now SSR-aware:
     - `deploy.sh` syncs `dist/client/` to the Apache docroot
     - `deploy.sh` syncs the full `dist/` bundle to `/site/dist/`
     - `deploy.sh` syncs `package.json` + `package-lock.json` to `/site/`
     - `deploy.sh` runs `npm ci --omit=dev` server-side
     - `deploy.sh` rewrites all built `file://` paths under `/site/dist/server/*.mjs`
     - `deploy.sh` restarts Node via `start.sh`

## Known Gaps / Not Yet Done

- `godaddy_order_id` in orders is a placeholder `FAM-<uuid>` — real GoDaddy order creation not wired
- `godaddy_shopper_id` on users: wiring is code-complete but GoDaddy API creds not on server — shopper creation will fail silently (non-blocking); billing/domains/hosting still return empty
- **GoDaddy API credentials (`GODADDY_API_KEY`, `GODADDY_API_SECRET`) NOT set on server** — Fritz action required: add to start.sh or server env
- PayPal checkout now has `create-order` + `capture-order` server routes, but the sandbox purchase flow still needs live browser verification after the guest-checkout migration
- PayPal webhook reconciliation is still not implemented; the current flow relies on client-driven create/capture plus DB-side orphan payment recovery
- Stripe wiring not started
- No email verification on register
- No cron/supervisor for Node restart on crash — manual restart only (via start.sh)
- Admin CMS pages not tested in browser (API tested; UI untested)
- Svelte dashboard components not tested with real auth in browser

## Key Technical Details

- **cPanel server:** `p3plzcpnl506112.prod.phx3.secureserver.net` (user: `nineoo`)
- **SSH key:** `~/.ssh/id_ed25519`
- **Server dist path:** `/home/nineoo/public_html/famtastichosting.com/site/dist/`
- **Build:** `npm run build`, then run `./deploy.sh`
- **Astro SSR note:** local builds still hardcode the build-machine absolute path; `deploy.sh` now rewrites every server-side `.mjs` artifact after sync so cPanel resolves correctly
- **Git lesson:** deploy from the canonical repo checkout only; duplicate local clones are drift traps

## Smoke Tests (2026-06-11 — post cart+admin+GoDaddy deploy)

- `GET https://famtastichosting.com/` — **200 OK**
- `GET https://famtastichosting.com/api/cart` — **200 OK**, `{"items":[],"count":0,"subtotalUSD":"$0.00"}`
- `GET https://famtastichosting.com/api/customer/products` — **302 → login** (correct: auth-gated)

## E2E Test Results (2026-06-10)

All 10 tests passed via `https://famtastichosting.com`:
1. Homepage: 200
2. Customer register: 201
3. Customer login: 200
4. Customer products: 200 (18 products)
5. Customer dashboard: 200
6. Create order: 201 (returns order id, product, total)
7. Admin login: 200 (role: admin)
8. Admin products: 200 (18 products with pricing)
9. Admin customers: 200 (list with order count + spend)
10. Logout: 200

## Reseller Context

- GoDaddy reseller storefront **facelift** with integrated auth + customer portal
- `famtastichosting.com` = branded front with login portal
- Customers route through FAMtastic brand — GoDaddy is wholesale backend only
