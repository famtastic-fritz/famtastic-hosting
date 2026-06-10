<?php
/**
 * PHP reverse proxy for FAMtastic Hosting facelift.
 * Routes dynamic requests to Node.js on port 3001.
 * Place in docroot as /proxy.php
 */

$target = 'http://127.0.0.1:3001' . $_SERVER['REQUEST_URI'];
$method  = $_SERVER['REQUEST_METHOD'];

// Collect request headers to forward
$headerLines = [];
foreach (getallheaders() as $name => $value) {
    $lc = strtolower($name);
    if ($lc !== 'host' && $lc !== 'connection' && $lc !== 'content-length') {
        $headerLines[] = "$name: $value";
    }
}

$body = file_get_contents('php://input');

$opts = [
    'http' => [
        'method'           => $method,
        'header'           => implode("\r\n", $headerLines),
        'content'          => $body,
        'timeout'          => 30,
        'ignore_errors'    => true,
        'follow_location'  => 0,
        'max_redirects'    => 0,
    ],
];

$context  = stream_context_create($opts);
$response = @file_get_contents($target, false, $context);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Node.js server unavailable']);
    exit;
}

// Parse and forward response headers
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $m)) {
            http_response_code((int)$m[1]);
        } elseif (strpos($header, ':') !== false) {
            $lc = strtolower(trim(substr($header, 0, strpos($header, ':'))));
            // Skip hop-by-hop headers
            if (!in_array($lc, ['transfer-encoding', 'content-length', 'connection'])) {
                header($header);
            }
        }
    }
}

header('Content-Length: ' . strlen($response));
echo $response;