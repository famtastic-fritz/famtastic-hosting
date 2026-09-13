#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { CpanelClient, inspect, digest, applyStep } from './cpanel.mjs';

// Operator CLI only, not an unauthenticated web API or a source of approval.
// Existing Studio secret material is injected into the process; never copied
// into manifests, customer records, command arguments, or emitted receipts.
function parseEnv(path) {
  const values = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}
function privateFile(path) {
  const stat = statSync(path);
  if (!stat.isFile() || (stat.mode & 0o077)) throw new Error('private_file_permissions_required');
  return readFileSync(path, 'utf8');
}

try {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (!['plan', 'digest', 'apply'].includes(command) || !argv.length) throw new Error('usage: plan|digest|apply manifest.json [--env-file path] [--approval path --step domain|mailboxes|tls]');
  const manifest = JSON.parse(readFileSync(argv.shift(), 'utf8'));
  const options = {};
  while (argv.length) {
    const flag = argv.shift();
    if (!['--env-file', '--approval', '--step', '--cert-file', '--key-file', '--chain-file'].includes(flag)
      || !argv.length || options[flag]) throw new Error('arguments_invalid');
    options[flag] = argv.shift();
  }
  if (command === 'digest') console.log(JSON.stringify({ manifest_sha256: digest(manifest) }));
  else {
    const env = { ...(options['--env-file'] ? parseEnv(options['--env-file']) : {}), ...process.env };
    const client = new CpanelClient({ hostname: env.CPANEL_HOSTNAME, account: env.CPANEL_USERNAME,
      token: env.CPANEL_API_TOKEN, port: env.CPANEL_PORT || 2083 });
    if (command === 'plan') {
      const result = await inspect(client, manifest);
      console.log(JSON.stringify(result, null, 2));
      if (result.blockers.length) process.exitCode = 2;
    }
    else {
      if (!options['--approval'] || !options['--step']) throw new Error('approval_and_step_required');
      const approval = JSON.parse(readFileSync(options['--approval'], 'utf8'));
      const tls = options['--step'] === 'tls' ? {
        certificate: readFileSync(options['--cert-file'], 'utf8'),
        key: privateFile(options['--key-file']), cabundle: readFileSync(options['--chain-file'], 'utf8'),
      } : null;
      console.log(JSON.stringify(await applyStep(client, manifest, approval, options['--step'], { secrets: env, tls }), null, 2));
    }
  }
} catch (error) {
  // Avoid printing JSON parser excerpts, filesystem input or provider messages.
  const code = /^[a-z][a-z0-9_: |.\[\]-]*$/.test(error.message) ? error.message : 'provisioning_failed_input_or_provider_unconfirmed';
  console.error(JSON.stringify({ ok: false, code })); process.exitCode = 1;
}
