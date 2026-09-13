# Shared-hosting provisioning

This is an **operator CLI**, not a public API, registrar purchasing integration,
new CRM, or proof of a finished customer launch. Drupal owns the customer,
request, order, selected build and service records. Existing FAMtastic Inc
cPanel capacity supplies hosting and mail; no per-customer hosting purchase is
made here.

## Current proof

- 16 local tests cover scoping, non-mutating plans, approval binding/expiry,
  collision protection, provider reconciliation, mailbox idempotency, error
  redaction and refusal of invalid TLS material.
- Live read-only cPanel inventory authenticated on 2026-09-12. No provider write
  has been exercised by this implementation.
- The Locs manifest is a **candidate**. The one-year domain purchase is provider-
  confirmed (USD 11.79), but registrar Contact Info is still FAMtastic/Fritz,
  not the customer. Customer ownership is unverified, mailbox names are
  undecided, and no provisioning approval file
  exists. Those are not defaults that an agent may silently mark complete.
- The dedicated GA4 property and web stream are created, with identifiers in
  the manifest and enhanced measurement off. The tag is not installed and
  real collection is unverified. Never recreate them on a retry.
- Existing cPanel preview content is separate from the selected Drupal proof.
  Fritz confirms the Locs design is final; the Hosting storefront redesign is
  deferred. Resolve the selected artifact and exact build before release.

## September 13 correction: control and customer ownership

Technical provision requires fresh (under 24 hours), exact-domain
`domain_control` evidence plus actual owner-approved operations. The pending
customer registrant decision is retained separately in `domain_ownership` and
must not be relabeled verified. It blocks final customer-ownership acceptance,
not independently authorized preparation on FAMtastic's controlled domain.
Eighteen local tests cover this separation and all previous safety checks.
Earlier ownership-blocked preflight files remain historical evidence.

## Scoped ACME reload installer

`scripts/provisioning/tls-reload.php` installs only the manifest-bound domain
using the HTTPS cPanel API, because the host's jailed `uapi` binary is broken.
Nineteen local tests cover private-path/permission checks, certificate/key/chain
scope, secret-safe failure and stdin-only exclusive configuration bootstrap.
It is not scheduled or provider-proven solely by these local tests.

Prepare stable certificate/key/chain and pinned manifest files with mode0600
inside an existing mode0700 nonpublic directory. Pass the secret configuration
through encrypted stdin to `php tls-reload.php --configure /private/reload.json`;
never put tokens in source, arguments, logs or the public webroot. Bootstrap
refuses overwrites and removes only its own new file if validation fails.
`--config /private/reload.json --check` validates without network. The same
command without `--check` is the scoped ACME reload command; it does not prove
browser trust or a future renewal. Keep provider acceptance and public TLS
verification distinct. Preserve other certificates and the existing cron.

## Commands

Run with Node 22 or newer. No additional dependencies are needed.

```sh
node --test scripts/provisioning/cpanel.test.mjs
node scripts/provisioning/run.mjs digest provisioning/manifests/tighten-up-your-locs.json
node scripts/provisioning/run.mjs plan provisioning/manifests/tighten-up-your-locs.json --env-file /secure/existing-cpanel.env
```

`plan` sends only inventory requests. It returns status 2 when blocked, 1 on
invalid input/provider uncertainty, and 0 for a clean hosting preflight. A clean
preflight is **not launch readiness**. The explicit `unproven` list must remain.

Inject `CPANEL_HOSTNAME`, `CPANEL_USERNAME`, `CPANEL_API_TOKEN` and optional
`CPANEL_PORT=2083` from the existing Studio-owned vault or secret source.
`--env-file` reads the existing file without executing it or copying its values.
Process environment takes precedence. Do not paste secrets into chat or command
arguments. Runtime private files and receipts are gitignored.

The document root is `/home/<account>/customer-sites/<site_id>/public`, outside
the primary site's public directory. This avoids publishing customer files
through a neighboring site's URL. Actual provider permission for that root
still needs a write-path test; do not silently relax isolation if the provider
rejects it. The script does not move or overwrite any existing directory.

## Approved execution

An owner-approved operational receipt must identify the exact manifest digest,
approver, approval evidence, time window (maximum 24 hours), and allowed steps.
This is a guard against operator error, not cryptographic proof of authority.
The agent must have the actual user's authorization; it may not invent a receipt
or treat its own JSON as permission. Keep receipts in `provisioning/private/`.

Approval shape:

```json
{
  "schema": "famtastic.provision-approval.v1",
  "manifest_sha256": "EXACT_MANIFEST_DIGEST",
  "approved_by": "ACTUAL_AUTHORIZER",
  "evidence_ref": "ACTUAL_APPROVAL_RECORD",
  "approved_at": "ACTUAL_APPROVAL_TIME",
  "expires_at": "ACTUAL_EXPIRY_TIME",
  "operations": ["domain", "mailboxes", "tls"]
}
```

```sh
node scripts/provisioning/run.mjs apply manifest.json --approval provisioning/private/approval.json --step domain
node scripts/provisioning/run.mjs apply manifest.json --approval provisioning/private/approval.json --step mailboxes
node scripts/provisioning/run.mjs apply manifest.json --approval provisioning/private/approval.json --step tls --cert-file /secure/cert.pem --key-file /secure/key.pem --chain-file /secure/chain.pem
```

- `domain` adds an already-owned domain to existing cPanel hosting. It does not
  register/buy the domain or change registrar delegation. cPanel creates its
  local zone; that does not prove public authoritative DNS is using the zone.
- `mailboxes` creates only missing manifest mailboxes. Existing passwords are
  not reset and existing boxes are not removed. Supply each new password from
  its named environment reference after securing it in the vault. All missing
  secrets are checked before the first creation.
- `tls` accepts a CA-issued certificate, matching private key and chain. The
  private-key file must have no group/other permission bits. Installation
  acknowledgement does not prove public TLS trust or renewal scheduling. This
  step does not issue or purchase a certificate and never disables validation.
- Provider uncertainty aborts without automatic retries. Inspect state before
  rerunning. Domain/mailbox reruns reconcile actual provider state, not a local
  success flag. TLS renewal/install replay remains an explicit operation.
- The current CLI is single-operator. Do not run concurrent apply processes or
  advertise it as an unattended multi-tenant worker. Distributed locking,
  durable worker leases/dead letters and receipt callbacks remain follow-up.

## Full launch checklist (not implemented by this CLI)

1. Verify current Drupal customer/request/order and selected approved artifact.
2. Quote the exact domain, term, taxes/fees, renewal behavior and registrant.
   Get transaction authorization; use the existing discounted shopper's saved
   payment method only for that approved purchase. Registrar account recovery
   and account consolidation are separate from customer identity.
3. Verify receipt and current DNS/domain control before technical provisioning.
   Separately verify the customer registrant before customer-ownership acceptance.
   Never substitute technical control evidence for customer ownership evidence.
4. Create the isolated cPanel domain/root; check neighbors remain unchanged.
5. Deploy only the approved version and compare file checksums. Remove no other
   site's content. Keep credentials/build metadata outside the public root.
6. Set DNS at its authoritative provider; preserve MX, TXT, DNSSEC and existing
   mail. Branded nameservers are deferred and unnecessary for this launch.
7. Obtain a CA certificate via the approved ACME client, install it, verify
   hostname/chain/HTTP redirect, and prove renewal and failure alerts. Existing
   account research reported AutoSSL unavailable; recheck before choosing it.
8. Agree mailbox names and access recipients. Provision mailboxes; verify MX,
   SPF, DKIM and DMARC, then test inbound and outbound with owner-authorized
   recipients. Do not interpret mailbox creation as delivery proof.
9. Create/reuse the correct customer GA4 property/web stream. Apply the site's
   privacy/consent configuration and verify real collection, not just a tag.
10. Test approved customer actions (including real request-to-book behavior),
    mobile/desktop, errors and ownership boundaries. Do not claim Booksy sync
    or calendar booking from a request form.
11. Save deployment/domain/mail/TLS/analytics receipts through canonical Drupal
    interfaces and verify the customer's portal projection. No direct SQL
    flags or invented payment, receipt, approval, delivery or hosting dates.

## Provider references

- [cPanel API tokens](https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/)
- [AddonDomain creation](https://api.docs.cpanel.net/cpanel-api-2/cpanel-api-2-modules-addondomain/cpanel-api-2-functions-addondomain-addaddondomain) — API 2 is deprecated, but cPanel documents no equivalent UAPI function for this operation.
- [Mailbox creation](https://api.docs.cpanel.net/openapi/cpanel/operation/add_pop/)
- [TLS installation](https://api.docs.cpanel.net/openapi/cpanel/operation/install_ssl/)
- [Domain inventory](https://api.docs.cpanel.net/openapi/cpanel/operation/domains_data/)

The static test fixture is not a GoDaddy sandbox, domain reservation, purchased
hosting product, real mailbox or issued certificate.
