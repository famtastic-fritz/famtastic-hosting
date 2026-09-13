import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './cpanel.mjs';

export const sha = value => createHash('sha256').update(value).digest('hex');
const requireValue = (v, code) => { if (!v) throw Error(code); };
export function safeRelative(path) {
  return typeof path === 'string' && path.length < 200 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)
    && path.split('/').every(s => s && s !== '.' && s !== '..' && !s.startsWith('.'))
    && !/(?:^|\/)(?:node_modules|vendor|tests?|private|secrets)(?:\/|$)/i.test(path);
}
export function makePackage(manifest, source, files, baseline = {}) {
  validateManifest(manifest);
  requireValue(/^[a-f0-9]{40}$/.test(source.commit) && /^refs\/heads\/[a-zA-Z0-9._/-]+$/.test(source.ref), 'source_identity_invalid');
  requireValue(files.length > 0 && files.length <= 100 && files.some(f => f.path === 'index.html'), 'allowlist_invalid');
  const seen = new Set(); let total = 0;
  for (const file of files) {
    requireValue(safeRelative(file.path) && /\.(?:html|css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2|txt|xml)$/.test(file.path), 'artifact_path_invalid');
    requireValue(!seen.has(file.path), 'duplicate_path'); seen.add(file.path);
    const bytes = Buffer.from(file.base64, 'base64'); total += bytes.length;
    requireValue(bytes.length && bytes.length <= 5000000 && sha(bytes) === file.sha256, 'artifact_hash_invalid');
  }
  requireValue(total <= 15000000, 'package_too_large');
  for (const [path, hash] of Object.entries(baseline)) requireValue(seen.has(path) && /^[a-f0-9]{64}$/.test(hash), 'baseline_invalid');
  const packageValue = { schema: 'famtastic.customer-artifact.v1', site_id: manifest.site_id, domain: manifest.domain,
    account: manifest.hosting.account, document_root: manifest.hosting.document_root, source, expected_existing: baseline, files };
  return packageValue;
}
function run(command, args, options = {}) {
  const r = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 24000000, ...options });
  requireValue(r.status === 0, command + '_failed');
  return r.stdout;
}
const shellQuote = value => "'" + value.replaceAll("'", "'\\''") + "'";
export async function main(args) {
  const mode = args.shift();
  requireValue(['build', 'deploy'].includes(mode), 'usage_build_or_deploy');
  const opts = {};
  while (args.length) {
    const key = args.shift(); requireValue(key.startsWith('--') && args.length, 'option_invalid');
    const val = args.shift(); if (key === '--file') (opts.files ||= []).push(val); else { requireValue(!opts[key], 'duplicate_option'); opts[key] = val; }
  }
  if (mode === 'build') {
    const repo = resolve(opts['--repo'] || '');
    requireValue(opts['--repo'] && opts['--manifest'] && opts['--source-dir'] && opts['--ref'] && opts['--output'], 'build_options_required');
    requireValue(safeRelative(opts['--source-dir']), 'source_dir_invalid');
    requireValue(/^refs\/heads\/[a-zA-Z0-9._/-]+$/.test(opts['--ref']), 'source_ref_invalid');
    requireValue(!run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repo }).trim(), 'source_worktree_dirty');
    const commit = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).trim();
    const remote = run('git', ['ls-remote', '--exit-code', 'origin', opts['--ref']], { cwd: repo }).trim().split(/\s+/)[0];
    requireValue(remote === commit, 'source_not_exact_pushed_ref');
    const files = (opts.files || []).map(path => {
      requireValue(safeRelative(path), 'file_path_invalid');
      const sourcePath = opts['--source-dir'] + '/' + path;
      const entry = run('git', ['ls-tree', commit, '--', sourcePath], { cwd: repo });
      requireValue(/^100644 blob |^100755 blob /.test(entry), 'source_not_regular_tracked_file');
      const bytes = run('git', ['show', commit + ':' + sourcePath], { cwd: repo, encoding: null });
      return { path, sha256: sha(bytes), base64: bytes.toString('base64') };
    });
    const baseline = opts['--baseline'] ? JSON.parse(await readFile(opts['--baseline'], 'utf8')) : {};
    const value = makePackage(JSON.parse(await readFile(opts['--manifest'], 'utf8')), { commit, ref: opts['--ref'], source_directory: opts['--source-dir'] }, files, baseline);
    const bytes = JSON.stringify(value);
    await writeFile(resolve(opts['--output']), bytes, { flag: 'wx', mode: 0o600 });
    return { status: 'packaged', sha256: sha(bytes), file_count: files.length, source_commit: commit };
  }
  requireValue(opts['--package'] && opts['--ssh'], 'deploy_options_required');
  const bytes = await readFile(opts['--package']);
  const value = JSON.parse(bytes);
  requireValue(value.schema === 'famtastic.customer-artifact.v1', 'package_invalid');
  // The same validator used on-host also gates a local dry-run. It never calls a provider.
  run('php', ['-r', 'require $argv[1]; artifactDecode(file_get_contents($argv[2]));', fileURLToPath(new URL('./artifact-install.php', import.meta.url)), resolve(opts['--package'])]);
  requireValue(new RegExp('^' + value.account + '@[a-zA-Z0-9.-]+$').test(opts['--ssh']) && /^[a-z][a-z0-9]{0,15}$/.test(value.account), 'ssh_account_invalid');
  const hash = sha(bytes), remoteDir = '/home/' + value.account + '/customer-artifact-inbox/' + hash;
  const command = 'php ' + remoteDir + '/artifact-install.php --apply ' + remoteDir + '/package.json --sha256 ' + hash;
  if (!opts['--apply']) return { status: 'dry_run', sha256: hash, target: '/home/' + value.account + '/' + value.document_root, remote_command: command, network_writes: 0 };
  requireValue(opts['--apply'] === hash, 'exact_package_approval_required');
  // SSH uses agent/key authentication already installed; no token or password.
  const home = '/home/' + value.account, inbox = home + '/customer-artifact-inbox';
  const prepare = 'set -eu; umask 077; test ! -L ' + shellQuote(home) + '; test -d ' + shellQuote(home)
    + '; test ! -L ' + shellQuote(inbox) + '; if test ! -e ' + shellQuote(inbox) + '; then mkdir ' + shellQuote(inbox)
    + '; fi; test -d ' + shellQuote(inbox) + '; test ! -e ' + shellQuote(remoteDir) + '; test ! -L ' + shellQuote(remoteDir)
    + '; mkdir ' + shellQuote(remoteDir);
  run('ssh', ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', opts['--ssh'], prepare]);
  const tmp = await mkdtemp(join(tmpdir(), 'artifact-transfer-'));
  try {
    await writeFile(join(tmp, 'package.json'), bytes, { mode: 0o600 });
    const secure = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes'];
    run('scp', ['-q', ...secure, join(tmp, 'package.json'), opts['--ssh'] + ':' + remoteDir + '/package.json']);
    run('scp', ['-q', ...secure, fileURLToPath(new URL('./artifact-install.php', import.meta.url)), opts['--ssh'] + ':' + remoteDir + '/artifact-install.php']);
    return { status: 'installer_returned', receipt: run('ssh', [...secure, opts['--ssh'], command]).trim(), sha256: hash };
  } finally { await rm(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(result => console.log(JSON.stringify(result))).catch(() => { console.error('Artifact release failed; inspect scoped source/package/provider state.'); process.exitCode = 1; });
}
