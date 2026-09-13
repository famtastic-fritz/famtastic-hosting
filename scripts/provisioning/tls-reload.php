<?php
declare(strict_types=1);

// CLI only. Run: php tls-reload.php --config /private/site/reload.json --check
// Omit --check only from an owner-authorized, scoped ACME renewal hook.
// Config contains credentials and must never be printed or placed in webroot.
function tlsRequire(bool $valid, string $code): void {
  if (!$valid) throw new RuntimeException($code);
}

function tlsFile(string $path, ?int $mode = NULL): string {
  clearstatcache(TRUE, $path);
  tlsRequire($path !== '' && str_starts_with($path, '/') && realpath($path) === $path && !is_link($path) && is_file($path), 'file_path_invalid');
  if ($mode !== NULL) tlsRequire((fileperms($path) & 0777) === $mode, 'file_permissions_invalid');
  if (function_exists('posix_geteuid')) tlsRequire(fileowner($path) === posix_geteuid(), 'file_owner_invalid');
  tlsRequire(filesize($path) <= 262144, 'file_too_large');
  $value = file_get_contents($path);
  tlsRequire(is_string($value) && $value !== '', 'file_unreadable');
  return $value;
}

function tlsWithin(string $path, string $root): bool {
  return str_starts_with($path, $root . '/');
}

function tlsValidate(string $configPath, int $now): array {
  $config = json_decode(tlsFile($configPath, 0600), TRUE, 32, JSON_THROW_ON_ERROR);
  tlsRequire(is_array($config) && ($config['schema'] ?? '') === 'famtastic.tls-reload.v1', 'config_schema_invalid');
  foreach (['site_id', 'domain', 'account', 'hostname', 'private_root', 'manifest_path', 'manifest_sha256', 'certificate_path', 'key_path', 'chain_path', 'token'] as $field) {
    tlsRequire(isset($config[$field]) && is_string($config[$field]) && $config[$field] !== '', 'config_field_invalid');
  }
  tlsRequire((bool) preg_match('/^[a-z][a-z0-9]{0,15}$/D', $config['account']), 'account_invalid');
  tlsRequire((bool) preg_match('/^[a-z0-9][a-z0-9-]{1,62}$/D', $config['site_id']), 'site_invalid');
  foreach (['domain', 'hostname'] as $field) tlsRequire((bool) filter_var($config[$field], FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) && str_contains($config[$field], '.') && strtolower($config[$field]) === $config[$field], 'hostname_invalid');
  tlsRequire(!filter_var($config['hostname'], FILTER_VALIDATE_IP), 'hostname_invalid');
  tlsRequire((bool) preg_match('/^[A-Za-z0-9_-]{12,512}$/D', $config['token']), 'token_invalid');
  $root = $config['private_root'];
  tlsRequire(realpath($root) === $root && is_dir($root) && !is_link($root) && (fileperms($root) & 0777) === 0700, 'private_root_invalid');
  tlsRequire(tlsWithin($configPath, $root), 'config_outside_private_root');
  // Standard cPanel web aliases may occur at any level, including nested sites.
  tlsRequire(!preg_match('~/(public_html|www|htdocs|httpdocs)(/|$)~', $root), 'private_root_is_public');
  foreach (['manifest_path', 'certificate_path', 'key_path', 'chain_path'] as $field) {
    tlsRequire(tlsWithin($config[$field], $root) && realpath($config[$field]) === $config[$field], 'material_outside_private_root');
  }
  $manifestBytes = tlsFile($config['manifest_path'], 0600);
  tlsRequire(hash_equals(hash('sha256', $manifestBytes), $config['manifest_sha256']), 'manifest_hash_mismatch');
  $manifest = json_decode($manifestBytes, TRUE, 32, JSON_THROW_ON_ERROR);
  tlsRequire(($manifest['schema'] ?? '') === 'famtastic.hosting-provision.v1' && ($manifest['site_id'] ?? '') === $config['site_id'] && ($manifest['domain'] ?? '') === $config['domain'] && ($manifest['hosting']['account'] ?? '') === $config['account'], 'manifest_scope_mismatch');
  $docroot = 'customer-sites/' . $config['site_id'] . '/public';
  tlsRequire(($manifest['hosting']['document_root'] ?? '') === $docroot, 'manifest_document_root_invalid');
  tlsRequire(!str_contains($root . '/', '/' . $docroot . '/'), 'private_root_is_public');
  $certPem = tlsFile($config['certificate_path']);
  $keyPem = tlsFile($config['key_path'], 0600);
  $chainPem = tlsFile($config['chain_path']);
  $cert = openssl_x509_read($certPem);
  $key = openssl_pkey_get_private($keyPem);
  tlsRequire($cert !== FALSE && $key !== FALSE && openssl_x509_check_private_key($cert, $key), 'certificate_key_mismatch');
  $parsed = openssl_x509_parse($cert);
  tlsRequire(is_array($parsed) && ($parsed['validFrom_time_t'] ?? PHP_INT_MAX) <= $now && ($parsed['validTo_time_t'] ?? 0) > $now + 86400, 'certificate_validity_invalid');
  tlsRequire(!str_contains((string) ($parsed['extensions']['basicConstraints'] ?? ''), 'CA:TRUE'), 'leaf_is_ca');
  $sans = array_map('trim', explode(',', (string) ($parsed['extensions']['subjectAltName'] ?? '')));
  tlsRequire(in_array('DNS:' . $config['domain'], $sans, TRUE), 'certificate_domain_mismatch');
  foreach ($sans as $san) tlsRequire(in_array($san, ['DNS:' . $config['domain'], 'DNS:www.' . $config['domain']], TRUE), 'certificate_extra_domain');
  preg_match_all('/-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----/s', $chainPem, $matches);
  tlsRequire(count($matches[0]) > 0 && count($matches[0]) <= 10, 'chain_invalid');
  $child = $cert;
  foreach ($matches[0] as $pem) {
    $issuer = openssl_x509_read($pem); $details = $issuer ? openssl_x509_parse($issuer) : FALSE;
    tlsRequire($issuer !== FALSE && is_array($details) && str_contains((string) ($details['extensions']['basicConstraints'] ?? ''), 'CA:TRUE'), 'chain_ca_invalid');
    tlsRequire(($details['validFrom_time_t'] ?? PHP_INT_MAX) <= $now && ($details['validTo_time_t'] ?? 0) > $now, 'chain_expired');
    $public = openssl_pkey_get_public($issuer);
    tlsRequire($public !== FALSE && openssl_x509_verify($child, $public) === 1, 'chain_signature_invalid');
    $child = $issuer;
  }
  // Chain signature validation is not browser/root-store trust certification.
  return [$config, ['domain' => $config['domain'], 'cert' => $certPem, 'key' => $keyPem, 'cabundle' => $chainPem]];
}

/** Exclusive initial bootstrap. Input contains secrets; never echo it. */
function tlsConfigure(string $path, string $json): void {
  tlsRequire(strlen($json) > 0 && strlen($json) <= 65536, 'bootstrap_input_size_invalid');
  $config = json_decode($json, TRUE, 32, JSON_THROW_ON_ERROR);
  tlsRequire(is_array($config) && isset($config['private_root']) && is_string($config['private_root']), 'bootstrap_config_invalid');
  $root = $config['private_root'];
  clearstatcache(TRUE, $root);
  tlsRequire(realpath($root) === $root && is_dir($root) && !is_link($root) && (fileperms($root) & 0777) === 0700, 'bootstrap_root_invalid');
  tlsRequire(!preg_match('~/(public_html|www|htdocs|httpdocs)(/|$)~', $root), 'bootstrap_public_root');
  tlsRequire(!preg_match('~/customer-sites/[^/]+/public(/|$)~', $root), 'bootstrap_public_root');
  if (function_exists('posix_geteuid')) tlsRequire(fileowner($root) === posix_geteuid(), 'bootstrap_root_owner_invalid');
  // Bootstrap only directly inside the already-private canonical directory.
  tlsRequire(dirname($path) === $root && preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/D', basename($path)) === 1, 'bootstrap_target_invalid');
  tlsRequire(!file_exists($path) && !is_link($path), 'bootstrap_target_exists');
  foreach (['manifest_path', 'certificate_path', 'key_path', 'chain_path'] as $field) {
    tlsRequire(isset($config[$field]) && is_string($config[$field]) && tlsWithin($config[$field], $root), 'bootstrap_material_invalid');
    tlsFile($config[$field], 0600);
  }
  $mask = umask(0077);
  try { $handle = fopen($path, 'x+b'); }
  finally { umask($mask); }
  tlsRequire(is_resource($handle), 'bootstrap_create_failed');
  $owned = fstat($handle);
  $valid = FALSE;
  try {
    tlsRequire(fwrite($handle, $json) === strlen($json) && fflush($handle), 'bootstrap_write_failed');
    tlsValidate($path, time());
    $valid = TRUE;
  } finally {
    fclose($handle);
    if (!$valid) {
      clearstatcache(TRUE, $path);
      $current = lstat($path);
      if (is_array($current) && !is_link($path) && $current['ino'] === $owned['ino'] && $current['dev'] === $owned['dev']) unlink($path);
    }
  }
}

function tlsMain(array $argv): int {
  set_error_handler(static function (): never { throw new RuntimeException('runtime_validation_warning'); });
  try {
    tlsRequire(PHP_SAPI === 'cli', 'cli_required');
    tlsRequire(extension_loaded('openssl') && extension_loaded('curl'), 'extensions_missing');
    $args = array_slice($argv, 1);
    if (($args[0] ?? '') === '--configure') {
      tlsRequire(count($args) === 2, 'usage_invalid');
      $input = stream_get_contents(STDIN, 65537);
      tlsRequire(is_string($input), 'bootstrap_input_unreadable');
      tlsConfigure($args[1], $input);
      fwrite(STDOUT, "{\"status\":\"configured\",\"network_calls\":0}\n");
      return 0;
    }
    $check = in_array('--check', $args, TRUE);
    $index = array_search('--config', $args, TRUE);
    tlsRequire($index !== FALSE && isset($args[$index + 1]) && count($args) === ($check ? 3 : 2), 'usage_invalid');
    [$config, $body] = tlsValidate($args[$index + 1], time());
    if ($check) { fwrite(STDOUT, "{\"status\":\"checked\",\"network_calls\":0,\"trust\":\"browser_verification_required\"}\n"); return 0; }
    $curl = curl_init('https://' . $config['hostname'] . ':2083/execute/SSL/install_ssl');
    tlsRequire($curl !== FALSE, 'curl_unavailable');
    curl_setopt_array($curl, [
      CURLOPT_POST => TRUE, CURLOPT_POSTFIELDS => http_build_query($body, '', '&', PHP_QUERY_RFC3986),
      CURLOPT_HTTPHEADER => ['Authorization: cpanel ' . $config['account'] . ':' . $config['token'], 'Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
      CURLOPT_RETURNTRANSFER => TRUE, CURLOPT_FOLLOWLOCATION => FALSE, CURLOPT_MAXREDIRS => 0,
      CURLOPT_SSL_VERIFYPEER => TRUE, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_CONNECTTIMEOUT => 15, CURLOPT_TIMEOUT => 60,
      CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    $response = curl_exec($curl); $http = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    unset($curl);
    tlsRequire(is_string($response) && $http === 200, 'provider_response_unconfirmed');
    $result = json_decode($response, TRUE, 64, JSON_THROW_ON_ERROR);
    tlsRequire(($result['status'] ?? NULL) === 1, 'provider_install_not_accepted');
    fwrite(STDOUT, "{\"status\":\"provider_accepted\",\"https_proof\":\"required\"}\n");
    return 0;
  } catch (Throwable $error) {
    // Never print provider bodies, paths, key material, URL, curl errors or tokens.
    fwrite(STDERR, "{\"status\":\"failed\",\"action\":\"inspect_private_config_and_provider_state_before_retry\"}\n");
    return 1;
  } finally {
    restore_error_handler();
  }
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) exit(tlsMain($argv));
