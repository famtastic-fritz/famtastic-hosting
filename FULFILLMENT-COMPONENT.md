# FAMtastic site-launch fulfillment component

`src/lib/fulfillment/site-launch.mjs` is the reusable contract for turning a
verified website payment and approved Git artifact into a provider-ready launch
plan. The operator UI is `SiteLaunchPlanner.astro` on `/admin/provisioning`; its
API is `POST /api/admin/fulfillment/plan` and is admin-only.

The contract orders the work as payment evidence, artifact evidence, optional
domain purchase, isolated cPanel document root, DNS, SSL, optional mailbox and
forwarding, then end-to-end verification. It rejects `public_html` root deploys,
mailboxes on the wrong domain, unverified payment/artifacts and domain purchases
without both a fresh quote and explicit owner approval.

The planner is intentionally side-effect-free. Provider execution uses
`executeSiteLaunch(plan, adapters, authorization)`. It refuses to run without a
separate owner authorization receipt, refuses missing adapters, stops on the
first unverified provider receipt and never substitutes a fallback. Existing
GoDaddy domain/DNS functions can be adapted to this interface after their exact
purchase contract is provider-tested; cPanel SSL/mailbox/forwarding adapters
remain separate capability gates.

Run:

```sh
npm test
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

These checks prove the component and admin surface locally. They do not prove a
domain purchase, hosting mutation, DNS propagation, issued certificate, mailbox,
forwarder, payment capture or deployment.
