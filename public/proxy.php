<?php
/**
 * PHP reverse proxy — routes requests to Node.js on port 3001.
 * 
 * Place this as index.php in /dashboard/, /admin/, and /api/ directories
 * within the docroot. Apache serves static files directly;
 * dynamic routes go through this proxy to Node.
 */

$nodeUrl = 'http://127.0.0.1:3001' . $_SERVER['REQUEST_URI'];
$method  = $_SERVER['REQUEST_METHOD'];
$headers = [];

// Forward original headers (except host)
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host') {
        $headers[] = "$name: $value";
    }
}

$opts = [
    'http' => [
        'method'  => $method,
        'header'  => implode("\r\n", $headers),
        'content' => file_get_contents('php://input'),
        'timeout' => 30,
        'ignore_errors' => true,
    ],
];

$context  = stream_context_create($opts);
$response = @file_get_contents($nodeUrl, false, $context);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Upstream server unavailable']);
    exit;
}

// Forward response headers
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header, $m)) {
            http_response_code((int)$m[1]);
        } elseif (strpos($header, ':') !== false && 
                  !preg_match('/^Transfer-Encoding/i', $header) &&
                  !preg_match('/^Content-Length/i', $header)) {
            header($header);
        }
    }
}

echo $response;