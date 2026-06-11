# FAMtastic Hosting — Deploy State Capture
**Updated:** 2026-06-10 (phases 1-8 complete)

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
   - `GET /api/admin/customers` — customer list with order count + total spend
   - `GET /api/admin/orders` — orders via GoDaddy API
   - `POST /api/orders/postback` — GoDaddy webhook receiver (validates secret, updates DB)

8. **Admin user seeded**
   - Email: `admin@famtastichosting.com`
   - Password: stored in cPanel MySQL (not in repo)
   - Role: `admin`

9. **Node.js server**
   - Binary: `/home/nineoo/.nvm/versions/node/v20.20.2/bin/node`
   - Serves from: `/home/nineoo/public_html/famtastichosting.com/site/dist/server/entry.mjs`
   - Port: 3001 (127.0.0.1 only, Apache proxies via proxy.php)
   - Start script: `/home/nineoo/public_html/famtastichosting.com/start.sh`
   - Log: `/tmp/famhosting-node.log`
   - **IMPORTANT:** After every new build deploy, patch entry.mjs paths (hardcoded to local machine):
     ```bash
     DIST=/home/nineoo/public_html/famtastichosting.com/site/dist
     sed -i "s|file:///Users/famtasticfritz/.*/dist/client/|file://${DIST}/client/|g" ${DIST}/server/entry.mjs
     sed -i "s|file:///Users/famtasticfritz/.*/dist/server/|file://${DIST}/server/|g" ${DIST}/server/entry.mjs
     ```

## Known Gaps / Not Yet Done

- `godaddy_order_id` in orders is a placeholder `FAM-<uuid>` — real GoDaddy order creation not wired
- `godaddy_shopper_id` on users is null — billing/domains/hosting return empty for all customers
- GoDaddy API credentials (`GODADDY_API_KEY`, `GODADDY_API_SECRET`) not set on server env
- No email verification on register
- No cron/supervisor for Node restart on crash (server requires manual restart)
- Admin pages not tested in browser (only API tested)
- Svelte dashboard components not tested with real auth in browser

## Key Technical Details

- **cPanel server:** `p3plzcpnl506112.prod.phx3.secureserver.net` (user: `nineoo`)
- **SSH key:** `~/.ssh/id_ed25519`
- **Server dist path:** `/home/nineoo/public_html/famtastichosting.com/site/dist/`
- **Build:** `npm run build` (local), then rsync `dist/` + patch `entry.mjs`
- **Astro SSR note:** `entry.mjs` hardcodes build-machine absolute paths — must patch on every deploy

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
