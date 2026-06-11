# FAMtasticHosting.com

Branded front-end and customer portal for the FAMtastic Hosting reseller business.

Live site:
- https://famtastichosting.com

Git remote:
- git@github.com:famtastic-fritz/famtastic-hosting.git

Canonical local checkout:
- `~/famtastic/famtastic-sites/famtastic-hosting`

Important:
- There is also a duplicate local checkout at `~/famtastic/famtastic-hosting`.
- Do not treat that duplicate as the deploy source of truth.
- Before any GoDaddy deploy, make sure you are in the canonical repo above.

## Source-of-truth contract

For this project, truth order is:
1. GitHub `famtastic-fritz/famtastic-hosting`
2. Canonical local checkout at `~/famtastic/famtastic-sites/famtastic-hosting`
3. Live GoDaddy server state

Server hotfixes are an emergency path only. If something is changed on the server, the repo must be updated immediately so the next deploy does not wipe it out.

## Pre-deploy git check

Run this before every deployment:

```bash
cd ~/famtastic/famtastic-sites/famtastic-hosting
git status --short --branch
git fetch origin
git rev-list --left-right --count origin/main...HEAD
```

Healthy output should mean:
- correct path
- branch is `main`
- remote is `origin`
- ahead/behind is `0 0` unless you intentionally have local commits to push
- working tree is clean before deploy

If you are not clean, stop and resolve git state first. Do not deploy from an ambiguous checkout.

## Deploy

```bash
cd ~/famtastic/famtastic-sites/famtastic-hosting
./deploy.sh
```

`deploy.sh` handles:
- local build
- Apache docroot sync for `dist/client/`
- SSR runtime sync for `dist/server/`
- runtime package metadata sync
- server-side `npm ci --omit=dev`
- Astro `file://` path rewrite for cPanel
- Node restart via `start.sh`

## GoDaddy / cPanel SSR contract

- Apache docroot: `/home/nineoo/public_html/famtastichosting.com/`
- Node runtime root: `/home/nineoo/public_html/famtastichosting.com/site/`
- Runtime entry: `/home/nineoo/public_html/famtastichosting.com/site/dist/server/entry.mjs`
- Node bind: `127.0.0.1:3001`
- Apache reaches Node through `proxy.php`

Why this matters:
- static files and SSR runtime are separate deploy targets
- any root-level rsync with `--delete` must exclude `site/`
- `.htaccess`, `proxy.php`, `start.sh`, and the runtime package install are part of the deploy contract, not optional cleanup

## See also

- `DEPLOY-STATE.md` — live system state, known gaps, smoke checks
- `deploy.sh` — canonical deployment script
- `start.sh` — Node runtime restart contract