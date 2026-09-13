<?php
declare(strict_types=1);

function artifactAssert(bool $value, string $code): void { if (!$value) throw new RuntimeException($code); }
function artifactPath(string $path): bool {
  return strlen($path) < 200 && preg_match('~^[a-zA-Z0-9][a-zA-Z0-9._/-]*$~D', $path) === 1
    && !array_filter(explode('/', $path), fn($s) => $s === '' || $s === '.' || $s === '..' || str_starts_with($s, '.'))
    && preg_match('~(?:^|/)(?:node_modules|vendor|tests?|private|secrets)(?:/|$)~i', $path) !== 1
    && preg_match('~\.(html|css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2|txt|xml)$~D', $path) === 1;
}
function artifactNoLinks(string $path, string $home): void {
  artifactAssert(str_starts_with($path, $home . '/'), 'path_outside_home');
  $cursor = $home;
  artifactAssert(realpath($home) === $home && !is_link($home), 'home_invalid');
  foreach (explode('/', substr($path, strlen($home) + 1)) as $part) {
    artifactAssert($part !== '' && $part !== '.' && $part !== '..', 'path_invalid');
    $cursor .= '/' . $part; artifactAssert(!is_link($cursor), 'symlink_rejected');
  }
}
function artifactDecode(string $bytes): array {
  artifactAssert(strlen($bytes) <= 24000000, 'bundle_too_large');
  $p = json_decode($bytes, TRUE, 64, JSON_THROW_ON_ERROR);
  artifactAssert(($p['schema'] ?? '') === 'famtastic.customer-artifact.v1', 'schema_invalid');
  artifactAssert(preg_match('/^[a-z][a-z0-9]{0,15}$/D', $p['account'] ?? '') === 1, 'account_invalid');
  artifactAssert(preg_match('/^[a-z0-9][a-z0-9-]{1,62}$/D', $p['site_id'] ?? '') === 1, 'site_invalid');
  artifactAssert(filter_var($p['domain'] ?? '', FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) !== FALSE && str_contains($p['domain'], '.'), 'domain_invalid');
  artifactAssert(($p['document_root'] ?? '') === 'customer-sites/' . $p['site_id'] . '/public', 'document_root_invalid');
  artifactAssert(preg_match('/^[a-f0-9]{40}$/D', $p['source']['commit'] ?? '') === 1 && str_starts_with($p['source']['ref'] ?? '', 'refs/heads/'), 'source_invalid');
  artifactAssert(is_array($p['files'] ?? NULL) && count($p['files']) > 0 && count($p['files']) <= 100, 'files_invalid');
  $seen = []; $total = 0;
  foreach ($p['files'] as $f) {
    artifactAssert(is_string($f['path'] ?? NULL) && artifactPath($f['path']) && !isset($seen[$f['path']]), 'file_path_invalid');
    $body = base64_decode($f['base64'] ?? '', TRUE);
    artifactAssert(is_string($body) && strlen($body) > 0 && strlen($body) <= 5000000 && hash('sha256', $body) === ($f['sha256'] ?? ''), 'file_integrity_invalid');
    $total += strlen($body); $seen[$f['path']] = TRUE;
  }
  artifactAssert($total <= 15000000 && isset($seen['index.html']), 'package_invalid');
  foreach (($p['expected_existing'] ?? []) as $name => $hash) artifactAssert(isset($seen[$name]) && preg_match('/^[a-f0-9]{64}$/D', $hash) === 1, 'baseline_invalid');
  return $p;
}
function artifactRun(string $bytes, string $hash, bool $apply, ?string $testHome = NULL): array {
  artifactAssert(hash('sha256', $bytes) === $hash, 'package_hash_mismatch');
  $p = artifactDecode($bytes);
  $home = $testHome ?? '/home/' . $p['account'];
  $site = $home . '/customer-sites/' . $p['site_id'];
  $public = $home . '/' . $p['document_root'];
  artifactNoLinks($public, $home);
  artifactAssert(is_dir($public) && realpath($public) === $public, 'provisioned_root_required');
  if (!$testHome) artifactAssert(function_exists('posix_geteuid') && fileowner($home) === posix_geteuid(), 'account_owner_mismatch_or_unverifiable');
  $statePath = $site . '/.artifact-state.json';
  artifactNoLinks($statePath, $home);
  $oldBytes = is_file($statePath) ? file_get_contents($statePath) : NULL;
  $old = $oldBytes === NULL ? [] : json_decode($oldBytes, TRUE, 64, JSON_THROW_ON_ERROR);
  artifactAssert(!$old || (($old['domain'] ?? '') === $p['domain'] && ($old['account'] ?? '') === $p['account'] && ($old['site_id'] ?? '') === $p['site_id']), 'previous_scope_mismatch');
  foreach (($old['files'] ?? []) as $name => $oldHash) artifactAssert(artifactPath($name) && preg_match('/^[a-f0-9]{64}$/D', $oldHash) === 1, 'previous_files_invalid');
  $files = $p['files'];
  usort($files, fn($a, $b) => ($a['path'] === 'index.html' ? 1 : 0) <=> ($b['path'] === 'index.html' ? 1 : 0));
  foreach ($files as $f) {
    $target = $public . '/' . $f['path']; artifactNoLinks($target, $home);
    artifactAssert(!is_dir($target), 'target_not_file');
    if (file_exists($target)) {
      $expected = $old['files'][$f['path']] ?? $p['expected_existing'][$f['path']] ?? '';
      artifactAssert($expected !== '' && hash_file('sha256', $target) === $expected, 'unmanaged_or_changed_target');
    }
  }
  if (!$apply) return ['status' => 'checked', 'writes' => 0, 'file_count' => count($files), 'index_last' => TRUE];
  $lockPath = $site . '/.artifact.lock'; artifactNoLinks($lockPath, $home);
  $lock = fopen($lockPath, 'c'); artifactAssert($lock !== FALSE && flock($lock, LOCK_EX | LOCK_NB), 'release_locked');
  chmod($lockPath, 0600);
  try {
    // Recheck state after acquiring the lock; never overwrite a concurrent release.
    artifactAssert((is_file($statePath) ? file_get_contents($statePath) : NULL) === $oldBytes, 'state_changed');
    $run = $site . '/.artifact-releases/' . $hash . '-' . bin2hex(random_bytes(4));
    artifactNoLinks($run, $home); mkdir($run, 0700, TRUE);
    $receipt = ['schema' => 'famtastic.customer-artifact-receipt.v1', 'status' => 'prepared', 'package_sha256' => $hash, 'site_id' => $p['site_id'], 'account' => $p['account'], 'domain' => $p['domain'], 'source' => $p['source'], 'public_root' => $public, 'previous_state' => $old, 'files' => [], 'promotion_order' => [], 'live_proof' => 'not_checked'];
    foreach ($files as $f) {
      $stage = $run . '/staged/' . $f['path']; if (!is_dir(dirname($stage))) mkdir(dirname($stage), 0700, TRUE);
      $body = base64_decode($f['base64'], TRUE); file_put_contents($stage, $body, LOCK_EX);
      artifactAssert(hash_file('sha256', $stage) === $f['sha256'], 'staging_hash_failure');
      $target = $public . '/' . $f['path']; $before = is_file($target) ? hash_file('sha256', $target) : NULL;
      if ($before !== NULL) {
        $expected = $old['files'][$f['path']] ?? $p['expected_existing'][$f['path']] ?? '';
        artifactAssert($before === $expected, 'target_changed');
        $backup = $run . '/backup/' . $f['path']; if (!is_dir(dirname($backup))) mkdir(dirname($backup), 0700, TRUE);
        artifactAssert(copy($target, $backup) && hash_file('sha256', $backup) === $before, 'backup_failed');
      }
      $receipt['files'][$f['path']] = ['before_sha256' => $before, 'after_sha256' => $f['sha256']];
    }
    $receiptPath = $run . '/receipt.json';
    file_put_contents($receiptPath, json_encode($receipt, JSON_THROW_ON_ERROR), LOCK_EX); chmod($receiptPath, 0600);
    try {
      foreach ($files as $f) {
        $target = $public . '/' . $f['path']; artifactNoLinks($target, $home);
        if (!is_dir(dirname($target))) mkdir(dirname($target), 0755, TRUE);
        $expected = $receipt['files'][$f['path']]['before_sha256'];
        artifactAssert((is_file($target) ? hash_file('sha256', $target) : NULL) === $expected, 'target_changed_before_promotion');
        $stage = $run . '/staged/' . $f['path']; chmod($stage, 0644);
        artifactAssert(rename($stage, $target), 'promotion_failed');
        $receipt['promotion_order'][] = $f['path'];
        file_put_contents($receiptPath, json_encode($receipt, JSON_THROW_ON_ERROR), LOCK_EX);
        artifactAssert(hash_file('sha256', $target) === $f['sha256'], 'promotion_integrity_failed');
      }
      $managed = $old['files'] ?? [];
      foreach ($files as $f) $managed[$f['path']] = $f['sha256'];
      $state = ['domain' => $p['domain'], 'account' => $p['account'], 'site_id' => $p['site_id'], 'files' => $managed, 'receipt' => $receiptPath];
      file_put_contents($run . '/state.json', json_encode($state, JSON_THROW_ON_ERROR)); chmod($run . '/state.json', 0600);
      artifactAssert(rename($run . '/state.json', $statePath), 'state_commit_failed');
      $receipt['status'] = 'files_installed_unverified';
    } catch (Throwable $error) {
      $receipt['status'] = 'rollback_required';
      file_put_contents($receiptPath, json_encode($receipt, JSON_THROW_ON_ERROR), LOCK_EX);
      foreach (array_reverse($receipt['promotion_order']) as $name) {
        $target = $public . '/' . $name;
        artifactNoLinks($target, $home);
        artifactAssert(hash_file('sha256', $target) === $receipt['files'][$name]['after_sha256'], 'rollback_conflict');
        if ($receipt['files'][$name]['before_sha256'] !== NULL) {
          artifactAssert(copy($run . '/backup/' . $name, $target) && hash_file('sha256', $target) === $receipt['files'][$name]['before_sha256'], 'rollback_restore_failed');
        } else artifactAssert(unlink($target), 'rollback_remove_failed');
      }
      $receipt['status'] = 'rolled_back';
      file_put_contents($receiptPath, json_encode($receipt, JSON_THROW_ON_ERROR), LOCK_EX);
      throw $error;
    }
    file_put_contents($receiptPath, json_encode($receipt, JSON_THROW_ON_ERROR), LOCK_EX);
    return ['status' => $receipt['status'], 'receipt_path' => $receiptPath, 'package_sha256' => $hash, 'live_proof' => 'required'];
  } finally { flock($lock, LOCK_UN); fclose($lock); }
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
  set_error_handler(static function (): never { throw new RuntimeException('runtime_failure'); });
  try {
    artifactAssert(PHP_SAPI === 'cli' && count($argv) === 5 && in_array($argv[1], ['--check', '--apply'], TRUE) && $argv[3] === '--sha256', 'usage_invalid');
    artifactAssert(realpath($argv[2]) === $argv[2] && is_file($argv[2]) && !is_link($argv[2]) && filesize($argv[2]) <= 24000000, 'package_path_invalid');
    echo json_encode(artifactRun(file_get_contents($argv[2]), $argv[4], $argv[1] === '--apply'), JSON_THROW_ON_ERROR) . "\n";
  } catch (Throwable) { fwrite(STDERR, "Artifact install failed. Inspect private staging and rollback receipt before retry.\n"); exit(1); }
}
