# FAMtastic Hosting — Deploy State Capture
**Captured:** 2026-06-10

## What's DONE

1. **Site built & deployed** — Astro static site built locally, rsync'd to GoDaddy cPanel
   - Local repo: `~/famtastic/famtastic-sites/famtastic-hosting/`
   - GitHub repo: `famtastic-fritz/famtastic-hosting`
   - Server docroot: `/home/nineoo/public_html/famtastichosting.com/`
   - Site serves on **HTTP** at `http://famtastichosting.com` — confirmed 200 OK

2. **SSH key authorized** — local `~/.ssh/id_ed25519` added to cPanel server `authorized_keys` via API
   - SSH works: `ssh -i ~/.ssh/id_ed25519 nineoo@p3plzcpnl506112.prod.phx3.secureserver.net`

3. **Git clone on server** — repo cloned to `~/public_html/famtastichosting.com/site/` (for cPanel Git Versioning future use)

4. **SSL cert issued & installed** — Let's Encrypt via certbot (manual HTTP-01 challenge, auth hook copies challenge file via SSH)
   - Cert expires: 2026-09-08
   - Covers: `famtastichosting.com` + `www.famtastichosting.com`
   - Apache restarting with new cert at time of capture
   - **HTTPS NOT YET VERIFIED** — was interrupted before confirming https:// works

5. **Deploy script created** — `~/famtastic/famtastic-sites/famtastic-hosting/deploy.sh` (npm build + rsync)
   - NOT YET COMMITTED to git

6. **Reference designs added to repo** — `extreme-reference.html` and `wild-reference.html` added to main repo, merged from sibling dirs

7. **cPanel API auth working** — `.env` at `~/famtastic/tools/cpanel-mcp/` has working creds for UAPI/v2 calls

## What's LEFT (in priority order)

### 1. Verify HTTPS (5 min)
- `curl -sI https://famtastichosting.com` — confirm 200 + cert
- `curl -sI https://www.famtastichosting.com` — confirm redirect or 200
- If cert not active yet, Apache may still be restarting — wait and retry

### 2. DNS cleanup — kill redirect to store (30 min)
- Currently `famtastichosting.com` A record points to `107.180.51.234` (cPanel server) ✅
- `www.famtastichosting.com` is a CNAME to `famtastichosting.com.` ✅
- Check if there's a redirect/forward rule sending traffic to `store.famtastichosting.com` — kill it
- GoDaddy DNS is at `ns71.domaincontrol.com` / `ns72.domaincontrol.com`
- Need GoDaddy API creds or manual DNS panel access to manage records

### 3. Email setup for Shay (1-2 hours)
- Create email account: `shay@famtastichosting.com` via cPanel API
- Set up IMAP/SMTP access
- Enable 2FA on the cPanel email account
- Wire up programmatic access (App Password → IMAP/SMTP for Shay's gateway)

### 4. Commit deploy workflow to git (15 min)
- `deploy.sh` is local only — needs to be committed and pushed
- `.cpanel.yml` was also created locally but may not have been committed
- Add `certbot-famhosting/` to `.gitignore` (certs should NOT be in repo)

### 5. Marketing content integration (ongoing)
- Site has placeholder/starter content — needs real pricing, real copy, real product links
- Store integration: link to `store.famtastichosting.com` for purchase flows

### 6. SSL renewal cron (15 min)
- Cert expires 2026-09-08 — need a cron job to renew via certbot + reinstall
- Could use Shay's cron system or a server-side cron

## Key Technical Details

- **cPanel server:** `p3plzcpnl506112.prod.phx3.secureserver.net`
- **cPanel user:** `nineoo`
- **cPanel port:** `2083`
- **Main domain on account:** `famtasticinc.com` (famtastichosting.com is an addon domain)
- **Server docroot for famtastichosting.com:** `/home/nineoo/public_html/famtastichosting.com/`
- **SSH user:** `nineoo` with `~/.ssh/id_ed25519` key
- **Certbot config dir:** `/tmp/certbot-famhosting/config/` (ephemeral — certs also saved server-side by cPanel)
- **Auth hook script:** `/tmp/certbot-famhosting/auth-hook.sh` (copies ACME challenge to server via SSH)

## cPanel API Gotchas Discovered
- UAPI (`/execute/`) works for: Fileman get_file_content, set_permissions, SSH import_key, SSL install_ssl, VersionControl list/retrieve/create
- UAPI does NOT work for: upload_file, write_file (file content creation)
- v2 API (`/json-api/cpanel`) works for: Fileman uploadfiles, Fileman fileop (delete), SSH listkeys
- AutoSSL feature is DISABLED on this GoDaddy reseller account — must use manual certbot
- The `tput: No value for $TERM` SSH warning is cosmetic and harmless

## Reseller Context
- This is a GoDaddy reseller storefront FACELIFT, not a new build
- `store.famtastichosting.com` = existing GoDaddy reseller store (purchase engine)
- `famtasticHosting.com` = branded 7-page hosting site (what we just deployed)
- Customers route through FAMtastic brand → GoDaddy is wholesale backend only