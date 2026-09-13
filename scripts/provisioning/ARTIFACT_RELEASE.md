# Exact customer artifact release (operator CLI)

This tool copies a reviewed static artifact, not the generic Site Studio renderer.
It does not claim booking, analytics collection, customer notification, or Drupal
deployment-ledger proof. It never changes DNS, hosting bindings, email, or SSL.

## Preconditions

- Independently verify cPanel's domain → account → document-root mapping against
  the provisioning manifest. The installer checks local path/scope and prior
  release state; it does **not** query cPanel to prove the first domain binding.
- Source worktree must be entirely clean, all public files explicitly tracked,
  and HEAD must exactly equal the selected `origin` branch's current remote SHA.
- Review public configuration and application behavior before packaging. An
  approved design alone is not proof that a disabled form is ready to publish.
- SSH agent/key access and an already verified known-host entry are required.
  This tool does not collect passwords or bypass host verification.
- The provisioned root must already exist. CLI installation is restricted to
  `/home/<account>/customer-sites/<site_id>/public` owned by the executing user.
  Site IDs and account names are constrained; public root replacement is forbidden.

## Build and inspect (no hosting writes)

```sh
node scripts/provisioning/artifact-release.mjs build \
  --repo /absolute/clean/source-repo \
  --manifest /absolute/private/provisioning-manifest.json \
  --source-dir website-delivery-swarm/pilots/shay-tighten-up-your-locs/releases/2026-09-12 \
  --ref refs/heads/REVIEWED_BRANCH \
  --file index.html --file styles.css --file site.js --file config.js \
  --file assets/archive-private-concept.png \
  --output /absolute/private/customer-package.json

node scripts/provisioning/artifact-release.mjs deploy \
  --package /absolute/private/customer-package.json --ssh nineoo@VERIFIED_HOST
```

The build uses Git objects, not working-tree copies. Only the named files enter
the package. No glob, directory recursion, dotfiles, server-side PHP, test files,
symlinks, or traversals are accepted. The output is exclusive-create mode 0600.
The asset name in this example must be confirmed as a public customer image;
never include a private review mockup just because it is in the source directory.

The default deploy prints a plan and SHA-256 without SSH or remote writes. It
validates package structure/integrity through the local PHP validator. A local
dry-run cannot establish current remote target drift, ownership, or provider state.

## Explicit apply

After reviewing the exact package/target, repeat deploy with `--apply <SHA256>`.
The value must equal the full package hash printed by build/dry-run. This performs
remote writes and requires the operator's scoped release authorization.

Upload goes into a new private `/home/<account>/customer-artifact-inbox/<hash>`.
An existing directory is refused: an interrupted or ambiguous run must be
inspected, not blindly retried. SSH rejects unknown host keys and interactive auth.
The uploaded PHP installer supports the following independent modes:

```sh
php /absolute/private/artifact-install.php --check /absolute/private/package.json --sha256 HASH
php /absolute/private/artifact-install.php --apply /absolute/private/package.json --sha256 HASH
```

`--check` performs local target/state validation with zero writes. `--apply`
locks the site, stages and verifies every file privately, backs up only existing
files that the package manages, then promotes assets before `index.html`.
Unrelated files, existing omitted files, and `.well-known`/ACME files are never
deleted. This is index-last promotion, **not** an atomic directory swap: keep
changed asset filenames backward-compatible or content-addressed.

Unknown existing managed filenames fail closed. To adopt a known maintenance
index or an earlier unmanaged release, supply `--baseline /private/baseline.json`
when building, containing only explicitly approved existing file SHA-256 values:
`{"index.html":"<64 hex characters>"}`. This is an overwrite authorization
boundary, not a way to ignore unexplained drift. Later releases require the
current file hashes to match the recorded managed state.

## Receipts and recovery

Private receipts/backups live alongside the public root under
`.artifact-releases/<package-hash>-<random>/`; managed state is
`.artifact-state.json`. Receipt status `files_installed_unverified` means files
were installed, not that the customer site is live or its workflow is proven.

On caught promotion/state-commit errors, the installer checks current promoted
hashes and restores only its managed files. A conflict leaves
`rollback_required`; never overwrite someone else's newer changes. The receipt
records before/after hashes, ordered promotions, prior state and backup locations.
Hard process termination can bypass automatic rollback. There is no separate
post-success rollback command yet: inspect the receipt and exact current hashes,
then perform an owner-reviewed managed-file restoration. Do not delete the root
or entire site. Keep backups private until main's verified-retention cleanup.

Public HTTP checks, mobile/desktop browser flow, real request persistence, owner
inbox/outbox delivery, analytics consent/collection, and an actual post-payment
customer deployment record remain separate launch checks. Do not fabricate a
pre-payment staging receipt for an already-paid order.

## Local tests

```sh
php scripts/provisioning/artifact-install.test.php
node --test scripts/provisioning/artifact-release.test.mjs
```

Tests use only temporary local files and a local bare Git origin. They cover
clean/pushed source gating, symlink/path/hash/account/root/domain rejection,
unknown-file collisions, explicit baseline backup, drift, private receipts,
ACME preservation, index-last promotion, and automatic rollback. They do not
prove SSH, cPanel, HTTP delivery, or a production PHP runtime.
