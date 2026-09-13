# Locs mailbox readiness — read-only provider check

Status: mailbox created and secure authentication proven after explicit parent coordination; DNS and test delivery remain separate.

## Creation and authentication receipt

- Created `hello@tightenupyourlocs.com` at `2026-09-13T08:01:54.970Z` with 1024 MB quota through the existing scoped `applyStep` implementation.
- Exact mail snapshot digest: `5ca6f20e412f3b386681821689cc857adff8abea111829a804b6c96a02569684`.
- A separate private mail manifest snapshot preserves the canonical manifest pinned by the TLS renewal hook.
- Random 36-byte secret, snapshot, approval and receipt are retained under the operator's private customer-mail directory outside the repository and public roots; directory mode0700, files0600. No secret printed or sent.
- SMTP465 and IMAP993 authentication both passed with strict certificate verification on `p3plzcpnl506112.prod.phx3.secureserver.net`.
- No mail was sent in these tests. No other mailbox was changed.

## Observed

- cPanel account `nineoo` on `p3plzcpnl506112.prod.phx3.secureserver.net` authenticates.
- `Email/list_pops` has no `@tightenupyourlocs.com` mailbox. Its domain argument did not filter the response; inspect exact email instead.
- `Email/list_mxs` reports local routing and local-zone MX priority 0 to the apex. This is not authoritative public DNS proof.
- `EmailAuth/validate_current_dkims` and `validate_current_spfs` are unavailable: account lacks `emailauth` feature. Do not confuse this with expired API credentials or fabricate a DKIM key.
- Secure TLS connection succeeds on provider hostname for IMAP 993 and SMTP 465. Provider certificate expires September 23, 2026; renewal belongs to provider.
- Apex SMTP 465 validates using the installed Locs certificate, but apex IMAP 993 fails hostname verification. Recommend provider hostname for both client settings, never disable verification.

## Exact implementation path

Reuse `scripts/provisioning/run.mjs` and `applyStep` — no new mailbox creator needed.

1. Create a separate mail manifest snapshot from the current Locs manifest; add `hello`, quota 1024 MB, secret reference `LOCS_HELLO_PASSWORD`. Do not overwrite the manifest pinned by the existing TLS renewal configuration.
2. Generate a strong random secret in process memory and retain it only in a private local or vault entry outside public roots and Git. Never print it or place it in command arguments. Preserve it before creating the mailbox so recovery does not require resetting it.
3. Bind a fresh operational approval receipt to this manifest digest, actual Fritz launch authorization, and `mailboxes` only. Existing expired domain/TLS receipt is not reusable.
4. Call `applyStep(client, manifest, approval, 'mailboxes', { secrets: { LOCS_HELLO_PASSWORD: secret } })`. It performs read reconciliation, creates only missing mailboxes, and never resets existing passwords.
5. Registrar-authoritative DNS: add mail A to `107.180.51.234`, MX apex priority 0 to `mail.tightenupyourlocs.com`, and sole apex SPF TXT `v=spf1 include:secureserver.net -all`. Preserve existing DMARC and other records. Recheck authoritative DNS before any addition to avoid duplicates.
6. Recheck local routing, authenticate via IMAP 993 and SMTP 465 on provider hostname with strict TLS validation.
7. Send a clearly identified test from hello to approved operator `fritz.medine@gmail.com`. Read provider receipt and Gmail Authentication-Results; require aligned SPF/DMARC before claiming deliverability. DKIM may be unavailable on this shared plan and must stay explicitly unproven.
8. Send a distinct controlled Gmail message to hello and verify the same Message-ID/body through IMAP. Provider acceptance alone is not inbound delivery.
9. Deliver customer setup using verified Drupal customer contact and a secure secret-sharing/access mechanism. Do not send plaintext password in a launch email, repurpose cPanel administrator login, or expose mailbox secrets in portal HTML.

## Sources

- https://www.godaddy.com/en-uk/help/configuring-dns-for-your-web-hosting-cpanel-domain-8852 — shared cPanel MX/SPF guidance.
- https://www.godaddy.com/en-in/help/set-up-spf-dkim-or-dmarc-records-for-my-hosting-email-40810 — SPF across hosting, DKIM subsection for VPS, DMARC policy.

## Remaining proof

Authoritative mail DNS, outbound/inbound delivery, customer credential access, and DKIM remain unproven. No new subscription or charge was incurred.

## Two-direction live test — September 13, 08:06–08:10 UTC

- Both authoritative nameservers now return MX priority0 to mail.tightenupyourlocs.com, mail A107.180.51.234, and the expected SPF; existing quarantine DMARC preserved.
- Exactly one hello-to-Fritz operational test sent through authenticated SMTP465. Provider accepted at08:06:06Z with queue ID `1x5fDx-00000009vet-11DG`.
- Outbound Message-ID: `<locs-verification-ddfc2053-f606-484e-a779-741ddef2228d@tightenupyourlocs.com>`; Gmail ID `1a099ce46ee07b8a`.
- Gmail received it at08:07:07Z, with SPF=pass and DMARC=pass. No DKIM signature. **Gmail placed this first test in SPAM**, so ordinary inbox placement is not proven and must not be claimed. No label mutation or spam bypass was applied.
- Exactly one authorized operational reply from Fritz, Gmail ID `1a099ce9c3798cb6`, Message-ID `<CAC5m-1+c0cb8+B32_aGJ33BczjGpL+m+N5toZ2nUPQtRRPPAJQ@mail.gmail.com>`.
- Strict-TLS IMAP993 search matched that exact Message-ID in hello INBOX; BODY.PEEK retrieved exact marker `LOCS-INBOUND-20260913-0808`. Inbound delivery is proven, without marking the message read.
- Test body explicitly disclaimed launch completion; no customer notice or credential email sent.
- Remaining: customer secure access handoff, DKIM/provider capability resolution, and reputation/inbox-placement follow-up. Do not substitute these receipts for the separate booking-notification workflow proof.

## Provider-native secure customer handoff — 08:13 UTC

- Official UserManager API and installed provider UI confirm the native sequence: create email-only Subaccount with `send_invite=1` and verified alternate email, omit email creation when it is an existing merge candidate, then `merge_service_account` with `services.email.merge=1`.
- Read-only conflict check returned `conflict=0`, exact existing hello service, no prior Subaccount or invitation. Server `invite_sub=1`; general self-service reset is disabled, but initial invitation capability is separately enabled.
- One invitation to the verified customer contact was provider-accepted. One existing hello mailbox was linked, not recreated. Read-back: one Subaccount, email enabled at1024MB, FTP disabled, Web Disk disabled, `has_invite=1`, expiration epoch1789459984 (September15 08:13UTC).
- Strict-TLS IMAP reauthentication confirms the existing mailbox password was preserved. No password supplied in the invitation operation, displayed, emailed, or committed.
- Customer must complete the provider's password-setting link. Provider acceptance is proven; customer inbox delivery and completion are not observable from the operator account. No claim that she already signed in.
- Operator private receipt: `customer-invitation-receipt.json` in the existing private customer-mail directory.
- Official references: https://docs.cpanel.net/cpanel/preferences/user-manager/ and https://api.docs.cpanel.net/specifications/cpanel.openapi/subaccount-management/usermanager-merge_service_account and https://api.docs.cpanel.net/specifications/cpanel.openapi/subaccount-management/usermanager-create_user .

## DKIM discovery correction — final read-only check

The EmailAuth feature rejection did **not** establish that DKIM is unavailable. `DNS/parse_zone` successfully returned a `default._domainkey` TXT record from cPanel's local, non-authoritative zone. Its existing public key parses as RSA2048; complete TXT SHA256 `85e157aad410831c7a64a57b370051e993e2d0e16bfe748a89a2a45e8e167a9b`. Authoritative ns43 had no matching TXT at this check. No private key inspected.

The original controlled Gmail receipt had no DKIM-Signature. Therefore publishing the existing public key is a supported next step, but does not itself prove outbound signing or inbox placement. No additional DNS mutation or test message was made in this discovery pass. Earlier blanket DKIM-unavailable wording is superseded by this narrower finding: EmailAuth interface unavailable; local public key exists; authoritative record missing; signing unproven.

## Corrective authentication test — 08:42 UTC

Main published the exact existing public key. Both authoritative nameservers were rechecked and matched. One separately authorized corrective message was sent to Fritz only at08:42:55Z, SMTP queue `1x5fna-0000000ABRp-3OfD`, Message-ID `<locs-auth-83722a25-5ebf-412d-8ae1-e7e2bebecab4@tightenupyourlocs.com>`, Gmail ID `1a099effccb71aed`.

Result: SPF=pass and DMARC=pass, but **no DKIM-Signature**, and Gmail again classified it SPAM. The public DKIM record is now installed, while the shared-host/relay outgoing signing path remains unproven. Do not claim that publishing the key fixed signing or inbox placement. No more corrective sends performed; no labels changed. This is distinct from the FAMtastic Designs transactional transport used for the launch notification.
