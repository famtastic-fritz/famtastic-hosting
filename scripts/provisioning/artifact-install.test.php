<?php
declare(strict_types=1);
require __DIR__ . '/artifact-install.php';
set_error_handler(static function (): never { throw new RuntimeException('runtime_failure'); });
$root = sys_get_temp_dir() . '/artifact-local-' . bin2hex(random_bytes(8)); mkdir($root, 0700);
$root = realpath($root); $count = 0;
function test(string $name, callable $fn): void { global $count; $fn(); $count++; echo "PASS $name\n"; }
function yes(bool $v): void { if (!$v) throw new RuntimeException('assertion_failed'); }
function denied(callable $fn): void { try { $fn(); } catch (Throwable) { return; } throw new RuntimeException('expected_denial'); }
function fixture(): array {
  global $root; $home = $root . '/' . bin2hex(random_bytes(4)); $public = $home . '/customer-sites/test-site/public'; mkdir($public, 0700, TRUE);
  $p = ['schema' => 'famtastic.customer-artifact.v1', 'site_id' => 'test-site', 'domain' => 'test.example.com', 'account' => 'testuser', 'document_root' => 'customer-sites/test-site/public', 'source' => ['commit' => str_repeat('a', 40), 'ref' => 'refs/heads/main'], 'expected_existing' => [], 'files' => []];
  foreach (['index.html' => '<h1>Test</h1>', 'assets/site.css' => 'body{color:red}'] as $name => $body) $p['files'][] = ['path' => $name, 'base64' => base64_encode($body), 'sha256' => hash('sha256', $body)];
  return [$home, $public, $p];
}
function invoke(array $p, string $home, bool $apply = TRUE): array { $bytes = json_encode($p, JSON_THROW_ON_ERROR); return artifactRun($bytes, hash('sha256', $bytes), $apply, $home); }
function cleanup(string $dir): void { foreach (scandir($dir) as $name) { if ($name === '.' || $name === '..') continue; $p = $dir . '/' . $name; if (is_dir($p) && !is_link($p)) cleanup($p); else unlink($p); } rmdir($dir); }
try {
test('check does not create lock staging or public files', function () { [$h,$d,$p]=fixture(); yes(invoke($p,$h,FALSE)['writes']===0); yes(scandir($d)===['.','..']); yes(!file_exists(dirname($d).'/.artifact.lock')); });
test('apply index last private receipt preserves ACME and unrelated files', function () { [$h,$d,$p]=fixture(); mkdir($d.'/.well-known',0700); file_put_contents($d.'/.well-known/token','acme'); file_put_contents($d.'/unrelated.txt','keep'); $r=invoke($p,$h); $v=json_decode(file_get_contents($r['receipt_path']),TRUE); yes($v['promotion_order']===['assets/site.css','index.html']); yes(file_get_contents($d.'/.well-known/token')==='acme' && file_get_contents($d.'/unrelated.txt')==='keep'); yes((fileperms($r['receipt_path'])&0777)===0600); yes($r['status']==='files_installed_unverified'); });
test('unknown existing managed name fails closed', function () { [$h,$d,$p]=fixture(); file_put_contents($d.'/index.html','old'); denied(fn()=>invoke($p,$h)); yes(file_get_contents($d.'/index.html')==='old'); });
test('explicit baseline adoption creates verified private backup', function () { [$h,$d,$p]=fixture(); file_put_contents($d.'/index.html','old'); $p['expected_existing']['index.html']=hash('sha256','old'); $r=invoke($p,$h); yes(file_get_contents(dirname($r['receipt_path']).'/backup/index.html')==='old'); });
test('managed second release accepted but drift rejected', function () { [$h,$d,$p]=fixture(); invoke($p,$h); invoke($p,$h); file_put_contents($d.'/index.html','external'); denied(fn()=>invoke($p,$h)); });
test('prior domain mismatch rejected', function () { [$h,$d,$p]=fixture(); invoke($p,$h); $p['domain']='other.example.com'; denied(fn()=>invoke($p,$h)); });
test('prior account mismatch rejected', function () { [$h,$d,$p]=fixture(); invoke($p,$h); $p['account']='another'; denied(fn()=>invoke($p,$h)); });
test('public root symlink rejected', function () { [$h,$d,$p]=fixture(); rmdir($d); mkdir($h.'/outside'); symlink($h.'/outside',$d); denied(fn()=>invoke($p,$h)); });
test('nested target symlink rejected', function () { [$h,$d,$p]=fixture(); mkdir($h.'/outside'); symlink($h.'/outside',$d.'/assets'); denied(fn()=>invoke($p,$h)); });
test('traversal hidden executable and private paths rejected', function () { foreach (['../x.html','.well-known/x.txt','private/x.js','x.php','/index.html'] as $name) { [$h,$d,$p]=fixture(); $p['files'][1]['path']=$name; denied(fn()=>invoke($p,$h)); } });
test('root mismatch rejected', function () { [$h,$d,$p]=fixture(); $p['document_root']='public_html'; denied(fn()=>invoke($p,$h)); });
test('package and per-file hashes rejected', function () { [$h,$d,$p]=fixture(); denied(fn()=>artifactRun(json_encode($p),str_repeat('0',64),FALSE,$h)); $p['files'][0]['sha256']=str_repeat('0',64); denied(fn()=>invoke($p,$h)); });
test('state commit failure rolls back promoted files and records receipt', function () { [$h,$d,$p]=fixture(); mkdir(dirname($d).'/.artifact-state.json'); denied(fn()=>invoke($p,$h)); yes(!file_exists($d.'/index.html') && !file_exists($d.'/assets/site.css')); $receipts=glob(dirname($d).'/.artifact-releases/*/receipt.json'); yes(count($receipts)===1); yes(json_decode(file_get_contents($receipts[0]),TRUE)['status']==='rolled_back'); });
echo "$count local tests passed; no provider calls.\n";
} finally { cleanup($root); }
