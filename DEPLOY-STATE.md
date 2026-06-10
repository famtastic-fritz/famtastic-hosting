# FAMtastic Hosting — Deploy State Capture
**Updated:** 2026-06-10 (phase 1 complete)

## What's DONE

1. **Site built & deployed** — Astro static site built locally, rsync'd to GoDaddy cPanel
   - Local repo: `~/famtastic/famtastic-sites/famtastic-hosting/`
   - GitHub repo: `famtastic-fritz/famtastic-hosting`
   - Server docroot: `/home/nineoo/public_html/famtastichosting.com/`
   - Site serves on **HTTPS** at `https://famtastichosting.com` — confirmed 200 OK

2. **SSL cert verified** — Let's Encrypt HTTPS is LIVE
   - Cert expires: 2026-09-08
   - Covers: `famtastichosting.com` + `www.famtastichosting.com`

3. **MySQL database connected** — FAMtastic Hosting DB (Supabase migrated to GoDaddy MySQL)
   - DB name: `FAMtastic Hosting`
   - User: `ShayShayDbAdmin`
   - Schema: `users`, `sessions`, `products`, `subscriptions` tables (all created)

4. **Authentication system LIVE** — complete signup/login/logout flow
   - `/api/auth/register` — create customer account with bcrypt-hashed password
   - `/api/auth/login` — validate credentials, create session in DB
   - `/api/auth/logout` — delete session, clear httpOnly cookie
   - Session stored in MySQL `sessions` table (session_id, token, expires, user_id)
   - Auth middleware enforces protected routes (/dashboard/*, /admin/*)

5. **Dashboard API endpoints LIVE**
   - `/api/customer/dashboard` — fetch customer subscriptions + product names
   - `/api/customer/products` — fetch product catalog (pricing, billing period)
   - Both endpoints require auth (via fam_session cookie)

6. **Frontend forms connected**
   - `/dashboard/register` — customer signup form (RegisterForm.svelte)
   - `/dashboard/login` — customer login form (LoginForm.svelte)
   - `/dashboard` — protected dashboard (shows customer subscriptions after login)
   - All forms call API endpoints and handle session cookies automatically

7. **End-to-end test suite created** — `tests/e2e-auth.sh`
   - Test flow: register → login → access dashboard → logout → verify redirect

## What's LEFT (in priority order)

### 1. Run end-to-end tests (5 min)
- Execute `tests/e2e-auth.sh` against live site
- Verify all auth flows work end-to-end

### 2. Create test customer accounts (15 min)
- Manually test signup at `https://famtastichosting.com/dashboard/register`
- Manually test login flow
- Verify dashboard loads with subscription data

### 3. Populate products table (30 min)
- Add real GoDaddy products to `products` table (domains, hosting plans, email)
- Set wholesale/retail pricing and markup %

### 4. Wire billing/checkout flow (1-2 hours)
- `/api/customer/checkout` endpoint — create Stripe/GoDaddy order
- Connect to store.famtastichosting.com purchase flow
- Sync purchased items back to FAMtastic customer dashboard

### 5. Email verification (1-2 hours)
- Wire `/api/auth/verify-email` endpoint
- Send confirmation email after signup
- Block login until email verified

### 6. SSL renewal cron (15 min)
- Cert expires 2026-09-08 — need cron to renew via certbot + reinstall

## Key Technical Details

- **cPanel server:** `p3plzcpnl506112.prod.phx3.secureserver.net`
- **cPanel user:** `nineoo`
- **SSH key:** `~/.ssh/id_ed25519` (authorized on server)
- **Server docroot:** `/home/nineoo/public_html/famtastichosting.com/`
- **MySQL DB:** `FAMtastic Hosting` @ `localhost:3306`
- **Session cookie:** `fam_session` (httpOnly, Secure, SameSite=Strict)
- **Build command:** `npm run build` (outputs to `dist/`)
- **Deploy method:** git push → SSH pull on server

## Reseller Context

- This is a GoDaddy reseller storefront FACELIFT with integrated auth + dashboard
- `store.famtastichosting.com` = existing GoDaddy reseller store (purchase engine)
- `famtastichosting.com` = branded hosting site with login portal (what we just deployed)
- Customers route through FAMtastic brand → GoDaddy is wholesale backend only
- Customers route through FAMtastic brand → GoDaddy is wholesale backend only