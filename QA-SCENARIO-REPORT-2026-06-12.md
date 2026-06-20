# FAMtastic Hosting QA Scenario Report

Date: 2026-06-12 19:08:50 EDT
Project: /Users/famtasticfritz/famtastic/sites/site-famtastic-hosting
Local target tested: http://127.0.0.1:4321

## Executive verdict

The site is logically split into two very different states:

1. Marketing/discovery is mostly alive.
2. Transactional/account infrastructure is not ready for customer trust.

That means a customer can browse, compare, and contact.
They cannot reliably buy, create an account, sign in, or move through a real cart/checkout flow right now.

The biggest systemic blocker is backend infrastructure:
- `POST /api/cart/add` returns 500
- `POST /api/auth/login` returns 500
- `POST /api/auth/register` returns 500 when called with valid payload shape
- local MySQL dependency is unreachable on `localhost:3306`
- checkout depends on cart + DB state, so purchase flow is blocked before it becomes trustworthy

## Core evidence

Confirmed directly during this pass:
- `GET /api/cart` -> 200 with empty cart JSON
- `POST /api/cart/add` -> 500 `{\"error\":\"Failed to add item to cart\"}`
- `POST /api/auth/login` -> 500 `{\"success\":false,\"error\":\"Internal server error\"}`
- `POST /api/auth/register` with valid payload -> 500 `{\"success\":false,\"error\":\"Internal server error\"}`
- `GET /api/customer/products` -> 401 `{\"error\":\"Unauthorized\",\"code\":\"UNAUTHORIZED\"}`
- domain lookup JS successfully calls `/api/godaddy/available?...` and renders results when the page submit flow is triggered in-page
- hosting add-to-cart JS successfully calls `/api/cart/add` and lands on `Error — try again`
- sign-in route is `/dashboard/login`
- create-account route is `/dashboard/register`
- forgot-password link points to `/dashboard/forgot-password`, but requesting that URL resolves back to `/dashboard/login`

Environment evidence already confirmed in this session:
- MySQL connection attempts to `127.0.0.1:3306` and `::1:3306` are refused
- no local MySQL listener is up

## Scenario matrix

Status meanings:
- PASS = customer can do it now
- PARTIAL = some of the flow works, but the outcome is incomplete or indirect
- FAIL = customer will hit a dead end or broken promise
- BLOCKED = scenario is structurally prevented by backend/infrastructure state

| # | Customer scenario | Expected outcome | Actual outcome | Status | Why |
|---|---|---|---|---|---|
| 1 | Visit home page | Site loads and introduces offer clearly | Main pages load with 200 and visible CTAs | PASS | Marketing shell is up |
| 2 | Navigate from home to product pages | Can reach product categories cleanly | Main pages `/domains`, `/hosting`, `/servers`, `/bundles`, `/contact` return 200 | PASS | Navigation shell works |
| 3 | Open domains page | Can see lookup form and domain pricing | Domains page loads correctly with form + TLD shortcut buttons | PASS | Discovery layer works |
| 4 | Search a specific domain from the domains form | Domain status and next step appear | In-page submit hits `/api/godaddy/available` and renders results + status text | PASS | Functional when page JS runs |
| 5 | Use TLD shortcut buttons like `Check .com Availability` | Shortcut fills example input and runs lookup | Shortcut triggers `/api/godaddy/available`, populates `yourbrand.com`, and renders results | PASS | Shortcut flow works |
| 6 | Move from domain result to immediate purchase | Can add/register directly in cart/checkout | Result CTA is a contact/help handoff, not direct purchase | PARTIAL | Domain research works, registration commerce is not self-serve |
| 7 | Use contact path after domain lookup | Can hand off registration intent to human | Contact route exists and is reachable | PARTIAL | Route exists, but this pass did not submit live contact data |
| 8 | Browse hosting plans | Can compare hosting options logically | Hosting page loads, pricing and plan comparison are clear | PASS | Product page is logically understandable |
| 9 | Add hosting plan to cart | Cart should gain selected plan | JS calls `/api/cart/add`, button ends at `Error — try again`, cart stays empty | FAIL | Cart API returns 500 |
| 10 | Open checkout after choosing hosting | Checkout should show selected item | Checkout opens but remains empty / browse-hosting fallback state | FAIL | Cart never persists item |
| 11 | Browse server plans | Can compare dedicated/server offer | Servers page loads and CTA script now binds | PASS | UI loads and script exists |
| 12 | Add server plan to cart | Cart should gain selected server plan | Server page JS calls `/api/cart/add`, resulting in failure behavior | FAIL | Same cart backend failure |
| 13 | Choose a server plan and proceed to checkout | Should arrive at checkout with chosen plan staged | Flow is blocked by cart failure before meaningful checkout state exists | FAIL | Checkout depends on cart |
| 14 | Open cart drawer as a guest | Can inspect current cart contents | Cart endpoint responds and guest cart opens empty | PASS | Read-only empty-cart state works |
| 15 | Create a new account | Customer can register portal account | Valid register request returns 500 internal server error | BLOCKED | Auth/register depends on broken DB layer |
| 16 | Sign in as returning customer | Customer can access portal | Login request returns 500 internal server error | BLOCKED | Auth/login depends on broken DB layer |
| 17 | Click `Forgot password?` | Password recovery page or flow appears | `/dashboard/forgot-password` resolves back to `/dashboard/login` | FAIL | Recovery link points to non-working/nonexistent destination |
| 18 | Reach customer-only products API while unauthenticated | Clean unauthorized response or redirect | `/api/customer/products` returns JSON 401 | PASS | API auth boundary is logically correct |
| 19 | Reach customer dashboard after successful login | Customer can manage services | Not realistically reachable because login itself is blocked | BLOCKED | Login is broken |
| 20 | Complete end-to-end self-serve purchase | Product -> cart -> checkout -> payment-ready state | Cannot happen locally right now | BLOCKED | Cart + DB dependency break core lane |
| 21 | Trust that a visible CTA actually does what it says | CTA should move user to expected next state | Discovery CTAs often work; transaction/account CTAs often fail | PARTIAL | Outcome mismatch is the biggest trust risk |

## Logical findings

### What is logically solid
- The site explains its offers well enough for a first-time visitor.
- Main product categories are understandable.
- Domains discovery is logically coherent when the JS flow is triggered.
- The guest cart endpoint itself can return a clean empty-cart response.
- Protected customer APIs reject unauthenticated calls in a sane way.

### What is logically broken
- Product selection does not become purchase progress.
  - Hosting/server add-to-cart actions present high buying intent.
  - The result is not “item added,” it is a backend failure.
- Checkout is present as a page but not reliably reachable as a meaningful state.
  - That creates a false sense of commerce readiness.
- Account creation and login are visible and look production-ready.
  - In reality, both are blocked by backend failure.
- Forgot-password is offered as if recovery exists.
  - The route resolves back to login, so recovery appears logically unimplemented.

### Trust-risk summary
The most dangerous problem is not that some things are unfinished.
It is that the unfinished pieces are sitting in the highest-trust, highest-intent customer lanes:
- buying
- signing in
- creating an account
- recovering access

A customer can reasonably believe the system is ready because the UI is polished enough.
Then the first serious action fails.
That is worse than simply hiding the feature.

## Priority order

### P0 — must be fixed before customer trust in self-serve commerce
1. Restore local/target MySQL availability for app runtime.
2. Make `POST /api/cart/add` succeed for valid hosting/server products.
3. Make registration and login succeed or intentionally disable those flows.
4. Decide whether checkout should be visible before cart/account infrastructure is healthy.

### P1 — fix logic mismatches that make the product feel dishonest
5. Replace broken transactional CTAs with graceful fallbacks if backend is down.
6. Fix forgot-password so it either exists or is removed.
7. Surface useful customer-facing error messages for auth/cart failures.

### P2 — improve commerce continuity
8. Clarify domain handoff versus direct self-serve purchase.
9. Confirm contact-submission success/error UX under real backend conditions.
10. Re-test full end-to-end customer journey after DB/cart/auth fixes.

## Final answer to the question

Can 15+ customer scenarios really happen right now?

Yes — but not in the way you want.

They split like this:
- Can happen cleanly now: discovery/browsing/research scenarios
- Can happen only partially: contact/handoff and some CTA journeys
- Cannot happen reliably now: buying, account creation, login, recovery, real checkout

So the site is logically usable as a marketing front door.
It is not logically ready as a self-serve hosting storefront until cart/auth/database reality matches the UI promises.
