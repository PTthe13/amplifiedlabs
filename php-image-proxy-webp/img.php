<?php
/**
 * Image proxy — fetches resized images from Cockpit using server-side API key.
 * Public-facing: clients hit /api/img.php?id=X&w=Y, we proxy to Cockpit.
 * Caches via HTTP headers (browser + Cloudflare).
 */
require_once __DIR__ . '/../lib/cockpit.php';

$id = preg_replace('/[^a-z0-9]/i', '', $_GET['id'] ?? '');
$w  = max(50, min(4000, (int)($_GET['w'] ?? 800)));
$q  = max(20, min(95, (int)($_GET['q'] ?? 80)));

if ($id === '') {
	http_response_code(400);
	exit('bad id');
}

$cfg = cp_config();
if (empty($cfg['base']) || empty($cfg['token'])) {
	http_response_code(500);
	exit('config missing');
}

$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$mime = str_contains($accept, 'image/webp') ? 'webp' : 'auto';

$url = rtrim($cfg['base'], '/') . '/api/assets/image/' . urlencode($id)
	. '?w=' . $w . '&m=bestFit&q=' . $q . '&mime=' . $mime . '&o=1';

$ch = curl_init($url);
curl_setopt_array($ch, [
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_TIMEOUT        => 10,
	CURLOPT_HTTPHEADER     => [
		'api-key: ' . $cfg['token'],
		'Accept: image/' . ($mime === 'webp' ? 'webp' : '*'),
	],
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
curl_close($ch);

if ($code !== 200 || !$body) {
	http_response_code(404);
	exit('not found');
}

header('Content-Type: ' . $type);
header('Cache-Control: public, max-age=2592000, immutable'); // 30d
header('Vary: Accept');
echo $body;
