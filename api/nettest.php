<?php
// One-time diagnostic: can this host make outgoing requests? DELETE after use.
// Prints no secrets.
header('Content-Type: text/plain');

echo "PHP " . PHP_VERSION . "\n";
echo "curl: " . (function_exists('curl_version') ? curl_version()['version'] . ' / ' . curl_version()['ssl_version'] : 'NOT INSTALLED') . "\n";
echo "allow_url_fopen: " . (ini_get('allow_url_fopen') ? 'on' : 'off') . "\n";
echo "disable_functions: " . (ini_get('disable_functions') ?: '(none)') . "\n";
echo "open_basedir: " . (ini_get('open_basedir') ?: '(none)') . "\n\n";

$targets = [
	'https://accounts.spotify.com/api/token',
	'https://api.spotify.com/v1/',
	'https://itunes.apple.com/search?term=kyla&limit=1',
	'http://example.com/',
	'https://example.com/',
];
foreach ($targets as $url) {
	$ch = curl_init($url);
	curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 8]);
	$body = curl_exec($ch);
	printf("curl  %-52s HTTP %s  errno %d %s  ip=%s\n", $url,
		curl_getinfo($ch, CURLINFO_HTTP_CODE), curl_errno($ch), curl_error($ch),
		curl_getinfo($ch, CURLINFO_PRIMARY_IP) ?: '-');
	curl_close($ch);
}

echo "\nDNS spotify: " . gethostbyname('accounts.spotify.com') . "\n";
$fp = @fsockopen('accounts.spotify.com', 443, $errno, $errstr, 8);
echo "raw socket :443 -> " . ($fp ? 'OPEN' : "BLOCKED ($errno $errstr)") . "\n";
if ($fp) fclose($fp);
$fp = @fsockopen('example.com', 80, $errno, $errstr, 8);
echo "raw socket :80  -> " . ($fp ? 'OPEN' : "BLOCKED ($errno $errstr)") . "\n";
if ($fp) fclose($fp);
