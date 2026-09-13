<?php
declare(strict_types=1);
require __DIR__ . '/tls-reload.php';

// Synthetic ephemeral certificates only. Never contacts cPanel.
$root = realpath(sys_get_temp_dir()) . '/tls-reload-fixture-' . bin2hex(random_bytes(6));
mkdir($root, 0700);
$checks = 0;
function testRequire(bool $value, string $message): void { if (!$value) throw new RuntimeException($message); }
function fixtureWrite(string $path, string $contents, int $mode = 0600): void { file_put_contents($path, $contents); chmod($path, $mode); }
function reject(callable $test, string $name): void {
  global $checks;
  $rejected = FALSE;
  try { $test(); } catch (Throwable) { $rejected = TRUE; }
  testRequire($rejected, $name . ' was not rejected'); $checks++;
}
try {
  $opensslConfig = "[req]\ndistinguished_name=dn\n[dn]\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:site.example.test\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n";
  fixtureWrite($root . '/openssl.cnf', $opensslConfig);
  $options = ['config' => $root . '/openssl.cnf', 'digest_alg' => 'sha256', 'private_key_bits' => 2048];
  $caKey = openssl_pkey_new($options);
  $caCsr = openssl_csr_new(['commonName' => 'Local Fixture CA'], $caKey, $options);
  $ca = openssl_csr_sign($caCsr, NULL, $caKey, 30, $options + ['x509_extensions' => 'ca']);
  $key = openssl_pkey_new($options);
  $csr = openssl_csr_new(['commonName' => 'site.example.test'], $key, $options);
  $leaf = openssl_csr_sign($csr, $ca, $caKey, 7, $options + ['x509_extensions' => 'leaf']);
  testRequire($ca !== FALSE && $leaf !== FALSE, 'fixture generation failed');
  openssl_x509_export($leaf, $certPem);
  openssl_x509_export($ca, $chainPem);
  openssl_pkey_export($key, $keyPem);
  fixtureWrite($root . '/cert.pem', $certPem); fixtureWrite($root . '/chain.pem', $chainPem); fixtureWrite($root . '/key.pem', $keyPem);
  $manifest = json_encode(['schema' => 'famtastic.hosting-provision.v1', 'site_id' => 'site-fixture', 'domain' => 'site.example.test', 'hosting' => ['account' => 'fixture', 'document_root' => 'customer-sites/site-fixture/public']], JSON_THROW_ON_ERROR);
  fixtureWrite($root . '/manifest.json', $manifest);
  $config = ['schema' => 'famtastic.tls-reload.v1', 'site_id' => 'site-fixture', 'domain' => 'site.example.test', 'account' => 'fixture', 'hostname' => 'cpanel.example.test', 'token' => 'fixture_not_a_real_secret', 'private_root' => $root, 'manifest_path' => $root . '/manifest.json', 'manifest_sha256' => hash('sha256', $manifest), 'certificate_path' => $root . '/cert.pem', 'key_path' => $root . '/key.pem', 'chain_path' => $root . '/chain.pem'];
  $writeConfig = function(array $value) use ($root): void { fixtureWrite($root . '/config.json', json_encode($value, JSON_THROW_ON_ERROR)); };
  $writeConfig($config);
  [, $payload] = tlsValidate($root . '/config.json', time());
  testRequire($payload['domain'] === 'site.example.test' && isset($payload['cert'], $payload['key'], $payload['cabundle']), 'exact SSL/install_ssl contract');
  $checks++;
  chmod($root . '/config.json', 0644); reject(fn() => tlsValidate($root . '/config.json', time()), 'world-readable config'); chmod($root . '/config.json', 0600);
  chmod($root . '/key.pem', 0644); reject(fn() => tlsValidate($root . '/config.json', time()), 'world-readable key'); chmod($root . '/key.pem', 0600);
  $writeConfig(array_replace($config, ['domain' => 'other.example.test'])); reject(fn() => tlsValidate($root . '/config.json', time()), 'scope mismatch');
  $writeConfig(array_replace($config, ['manifest_sha256' => str_repeat('0', 64)])); reject(fn() => tlsValidate($root . '/config.json', time()), 'manifest mismatch');
  $writeConfig(array_replace($config, ['key_path' => '/tmp/outside.key'])); reject(fn() => tlsValidate($root . '/config.json', time()), 'outside root');
  $writeConfig($config);
  reject(fn() => tlsValidate($root . '/config.json', time() + 8 * 86400), 'expired certificate');
  openssl_pkey_export($caKey, $wrongKey); fixtureWrite($root . '/key.pem', $wrongKey);
  reject(fn() => tlsValidate($root . '/config.json', time()), 'mismatched key');
  fixtureWrite($root . '/key.pem', $keyPem);
  fixtureWrite($root . '/chain.pem', 'invalid');
  reject(fn() => tlsValidate($root . '/config.json', time()), 'invalid chain');
  fixtureWrite($root . '/chain.pem', $chainPem);
  fixtureWrite($root . '/openssl.cnf', str_replace('DNS:site.example.test', 'DNS:site.example.test,DNS:other.example.test', $opensslConfig));
  $extra = openssl_csr_sign($csr, $ca, $caKey, 7, $options + ['x509_extensions' => 'leaf']);
  openssl_x509_export($extra, $extraPem); fixtureWrite($root . '/cert.pem', $extraPem);
  reject(fn() => tlsValidate($root . '/config.json', time()), 'unrelated SAN');
  fixtureWrite($root . '/cert.pem', $certPem);
  $process = proc_open([PHP_BINARY, __DIR__ . '/tls-reload.php', '--config', $root . '/config.json', '--check'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
  $stdout = stream_get_contents($pipes[1]); $stderr = stream_get_contents($pipes[2]);
  fclose($pipes[1]); fclose($pipes[2]); $exit = proc_close($process);
  testRequire($exit === 0 && str_contains($stdout, '"network_calls":0') && !str_contains($stdout . $stderr, $config['token']) && !str_contains($stdout . $stderr, 'PRIVATE KEY'), 'CLI dry-run/sanitization');
  $checks++;
  chmod($root . '/config.json', 0644);
  $process = proc_open([PHP_BINARY, __DIR__ . '/tls-reload.php', '--config', $root . '/config.json', '--check'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
  $stdout = stream_get_contents($pipes[1]); $stderr = stream_get_contents($pipes[2]);
  fclose($pipes[1]); fclose($pipes[2]); $exit = proc_close($process);
  testRequire($exit === 1 && !str_contains($stderr, $root) && !str_contains($stderr, $config['token']) && !str_contains($stderr, 'PRIVATE KEY'), 'failure output sanitization');
  $checks++;
  $bootstrap = $root . '/bootstrap.json';
  $json = json_encode($config, JSON_THROW_ON_ERROR);
  $process = proc_open([PHP_BINARY, __DIR__ . '/tls-reload.php', '--configure', $bootstrap], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
  fwrite($pipes[0], $json); fclose($pipes[0]);
  $stdout = stream_get_contents($pipes[1]); $stderr = stream_get_contents($pipes[2]);
  fclose($pipes[1]); fclose($pipes[2]); $exit = proc_close($process);
  clearstatcache(TRUE, $bootstrap);
  testRequire($exit === 0 && (fileperms($bootstrap) & 0777) === 0600 && str_contains($stdout, '"network_calls":0') && !str_contains($stdout . $stderr, $config['token']), 'bootstrap success');
  $checks++;
  $hash = hash_file('sha256', $bootstrap);
  reject(fn() => tlsConfigure($bootstrap, $json), 'bootstrap no overwrite');
  testRequire(hash_file('sha256', $bootstrap) === $hash, 'existing config changed'); $checks++;
  $failedPath = $root . '/failed.json';
  reject(fn() => tlsConfigure($failedPath, json_encode(array_replace($config, ['manifest_sha256' => str_repeat('0', 64)]))), 'bootstrap bad manifest');
  testRequire(!file_exists($failedPath), 'own failed bootstrap was not cleaned'); $checks++;
  reject(fn() => tlsConfigure($root . '/oversized.json', str_repeat('x', 65537)), 'bootstrap size cap');
  symlink($root . '/missing.json', $root . '/symlink.json');
  reject(fn() => tlsConfigure($root . '/symlink.json', $json), 'bootstrap symlink');
  testRequire(is_link($root . '/symlink.json'), 'existing symlink removed'); unlink($root . '/symlink.json');
  echo "PASS: {$checks} local TLS checks; zero provider calls. Synthetic CA is not public trust proof.\n";
} finally {
  // Exact test-owned flat fixture directory only.
  foreach (glob($root . '/*') ?: [] as $file) if (is_file($file)) unlink($file);
  rmdir($root);
}
