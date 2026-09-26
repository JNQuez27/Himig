<?php
// Himig — Spotify feed, restricted to Filipina (Pinay) female singers.
//   GET spotify.php?feed=home      shuffled mix (30 tracks, max 3 per singer)
//   GET spotify.php?feed=trending  newest releases first (25 tracks, max 2 per singer)
// Returns the app's track shape: [{id, title, artist, album, art, preview}]
//
// How "strictly Pinay female" is enforced:
//   - Spotify has no gender/nationality field, so singers are an allowlist,
//     each PINNED to her exact Spotify artist id (names alone are ambiguous:
//     "Kyla" and "Nina" also match a UK and a German artist).
//   - A track is kept only if its PRIMARY artist is one of those ids, so a
//     male artist's song that merely features her is dropped.
// Spotify dev-mode apps no longer get top-tracks, popularity, genres or
// preview_url, so: songs come from track search, "trending" = newest
// releases, and the 30s preview is matched from iTunes (same singer + title).
// Secrets come from .env next to this file (blocked from the web by .htaccess).

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Spotify artist name => Spotify artist id. Solo Filipina singers + all-female
// Filipino groups; each id checked by hand against her discography.
// To add one: open her Spotify page, copy the id from the URL (open.spotify.com/artist/<id>).
const PINAY = [
	'Regine Velasquez'    => '3wNylAjJX1PiCpMKx8Lrfp',
	'Sarah Geronimo'      => '6aiCKnIN68hohzU3ZzNq48',
	'Moira Dela Torre'    => '0rZRTXEmmPmx6gt92tBqIc',
	'KZ Tandingan'        => '1mcqfNCReSFxun2vIWvC28',
	'Morissette'          => '62WbvkXqQGvXQvw74GU3kQ',
	'Kyla'                => '2vTbuBRo7ACOZ3JsCnaL7S', // not the UK Kyla (77DAFfvm…)
	'Yeng Constantino'    => '0DnjaQqb436AH1idffI6CQ',
	'Julie Anne San Jose' => '4NeCu267LZemnoq44lZYKy',
	'Angeline Quinto'     => '7DW4ijH3n36QN0RlC0n649',
	'Lea Salonga'         => '1GlMjIezcLwV3OFlX0uXOv',
	'Jona'                => '7LVPSD4kabI5LiXIVPI8tn',
	'Zsa Zsa Padilla'     => '5E5sr7RkHU6tdxk5G8zF4A',
	'Sharon Cuneta'       => '3I5ONm7nnP1LpvqsnA5dBG',
	'Lani Misalucha'      => '29Aqsp33ANrcidwOkNJJU6',
	'Jolina Magdangal'    => '19jotRfFullBKocQAhkvjs',
	'Toni Gonzaga'        => '5BAyYwbv8OSfqeXMjPgWX6',
	'Nina'                => '2tQbSWgZLIB8MXMnsXVRro', // not the German Nina (1vMDpkbR…)
	'Juris'               => '4BNWanhw4AjSXjBm9L1Jzy',
	'Kitchie Nadal'       => '4OjU5UP0GFWeniBC82sGBY',
	'Rachelle Ann Go'     => '0YaTdozvKSQ2UkOTTONmSJ',
	'Janine Berdin'       => '4qPhnQfRgdgcZEdXgENOnr',
	'Zephanie'            => '3BdpcQRF27n7ZNSL386mNU',
	'Maymay Entrata'      => '4JliYPIw09GespZAmZv6rI',
	'Belle Mariano'       => '404RA7nuwzYA8WskpMgUp1',
	'Kiana V'             => '1DZGAZcaTA32eLJELEsjXY', // Kiana Valenciano's artist name
	'Clara Benin'         => '5ebPSE9YI5aLeZ1Z2gkqjn',
	'Reese Lansangan'     => '2JI8ViuZDBybY6Xd9ujUrb',
	'Nadine Lustre'       => '17Do37U0HEbxu1tOrKH8dL',
	'BINI'                => '7tNO3vJC9zlHy2IJOx34ga',
	'KAIA'                => '5UWPjwwieMFFohWLHe4Usy', // P-pop group, not 77v6CehS…
];
const CACHE_TTL = 6 * 3600; // ponytail: file cache, 6h; move to the tracks table if you need it shared/inspectable

function fail($msg, $code = 500)
{
	http_response_code($code);
	echo json_encode(array('status' => 0, 'status_message' => $msg));
	exit;
}

// KEY=value lines; `#` comments and blank lines skipped. (parse_ini_file
// can't be used: it rejects `#` comments, the standard .env style.)
function readEnv($path)
{
	$env = [];
	foreach (@file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
		$line = trim($line);
		if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
		[$key, $value] = explode('=', $line, 2);
		$env[trim($key)] = trim(trim($value), "\"'");
	}
	return $env;
}

// Parallel GETs; returns decoded JSON per key (null on failure).
function multiGet(array $urls, array $headers = [])
{
	$mh = curl_multi_init();
	$handles = [];
	foreach ($urls as $key => $url) {
		$ch = curl_init($url);
		curl_setopt_array($ch, [
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_TIMEOUT => 15,
			CURLOPT_HTTPHEADER => $headers,
		]);
		curl_multi_add_handle($mh, $ch);
		$handles[$key] = $ch;
	}
	do {
		curl_multi_exec($mh, $running);
		curl_multi_select($mh);
	} while ($running > 0);

	$out = [];
	foreach ($handles as $key => $ch) {
		$ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
		$out[$key] = $ok ? json_decode(curl_multi_getcontent($ch), true) : null;
		curl_multi_remove_handle($mh, $ch);
		curl_close($ch);
	}
	curl_multi_close($mh);
	return $out;
}

// "Tala - Live" / "Tala (From the film)" / "TALA!" -> "tala", for matching across services.
function normTitle($title)
{
	$t = strtolower($title);
	$t = preg_replace('/\s*[\(\[].*?[\)\]]/', '', $t);
	$t = preg_replace('/\s+-\s+.*$/', '', $t);
	return preg_replace('/[^a-z0-9]+/', '', $t);
}

// Keeps only tracks whose PRIMARY artist id is a pinned Pinay id; one per singer+title.
function pinayTracks(array $spotifyTracks, array $pinnedIds)
{
	$seen = [];
	$out = [];
	foreach ($spotifyTracks as $t) {
		$primaryId = $t['artists'][0]['id'] ?? '';
		$singer = $pinnedIds[$primaryId] ?? null;
		if ($singer === null) continue;
		$key = $singer . '|' . normTitle($t['name']);
		if (isset($seen[$key])) continue;
		$seen[$key] = true;
		$out[] = [
			'id' => $t['id'],
			'title' => $t['name'],
			'artist' => $singer,
			'album' => $t['album']['name'] ?? null,
			'art' => $t['album']['images'][0]['url'] ?? null,
			'preview' => $t['preview_url'] ?? null,
			'released' => $t['album']['release_date'] ?? '',
		];
	}
	return $out;
}

// iTunes songs -> [singer => [normTitle => previewUrl]], only where iTunes
// credits the same singer as the lead ("Sarah Geronimo" or "Sarah Geronimo & …").
function previewIndex(array $itunesBySinger)
{
	$index = [];
	foreach ($itunesBySinger as $singer => $res) {
		foreach ($res['results'] ?? [] as $s) {
			if (empty($s['previewUrl'])) continue;
			if (stripos($s['artistName'] ?? '', $singer) !== 0) continue;
			$key = normTitle($s['trackName'] ?? '');
			if ($key !== '' && !isset($index[$singer][$key])) $index[$singer][$key] = $s['previewUrl'];
		}
	}
	return $index;
}

// At most $max songs per singer, keeping the given order.
function capPerSinger(array $tracks, $max)
{
	$count = [];
	return array_values(array_filter($tracks, function ($t) use (&$count, $max) {
		$count[$t['artist']] = ($count[$t['artist']] ?? 0) + 1;
		return $count[$t['artist']] <= $max;
	}));
}

function buildPool()
{
	$env = readEnv(__DIR__ . '/.env');
	$id = $env['SPOTIFY_CLIENT_ID'] ?? '';
	$secret = $env['SPOTIFY_CLIENT_SECRET'] ?? '';
	if ($id === '' || $secret === '') fail('Spotify Client ID/Secret missing in api/.env');

	// 1. App token (Client Credentials flow — no user login needed).
	$ch = curl_init('https://accounts.spotify.com/api/token');
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_TIMEOUT => 10,
		CURLOPT_POST => true,
		CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
		CURLOPT_USERPWD => "$id:$secret",
	]);
	$raw = curl_exec($ch);
	$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$curlError = curl_error($ch);
	curl_close($ch);
	if ($raw === false) fail("Host could not reach Spotify: $curlError", 502);
	$token = json_decode($raw, true)['access_token'] ?? null;
	if (!$token) fail("Spotify rejected the Client ID/Secret (HTTP $httpCode: " . substr($raw, 0, 120) . ')', 502);
	$auth = ["Authorization: Bearer $token"];

	// 2. Each singer's songs via track search (2 pages of 10 — dev-mode max).
	$searches = [];
	foreach (PINAY as $name => $artistId) {
		foreach ([0, 10] as $offset) {
			$searches["$name|$offset"] = 'https://api.spotify.com/v1/search?type=track&limit=10&market=PH'
				. "&offset=$offset&q=" . rawurlencode('artist:"' . $name . '"');
		}
	}
	$all = [];
	foreach (multiGet($searches, $auth) as $res) {
		foreach ($res['tracks']['items'] ?? [] as $t) $all[] = $t;
	}
	$tracks = pinayTracks($all, array_flip(PINAY));
	if (!$tracks) fail('Spotify returned no songs for the Pinay singers', 502);

	// 3. Playable 30s previews from iTunes, one query per singer.
	$lookups = [];
	foreach (array_keys(PINAY) as $name) {
		$lookups[$name] = 'https://itunes.apple.com/search?entity=song&attribute=artistTerm&limit=200&country=PH&term='
			. rawurlencode($name);
	}
	$previews = previewIndex(multiGet($lookups));
	foreach ($tracks as &$t) {
		$t['preview'] = $t['preview'] ?: ($previews[$t['artist']][normTitle($t['title'])] ?? null);
	}
	unset($t);

	return array_values(array_filter($tracks, fn($t) => !empty($t['preview'])));
}

// App token (Client Credentials flow — no user login needed).
function spotifyToken()
{
	$env = readEnv(__DIR__ . '/.env');
	$id = $env['SPOTIFY_CLIENT_ID'] ?? '';
	$secret = $env['SPOTIFY_CLIENT_SECRET'] ?? '';
	if ($id === '' || $secret === '') fail('Spotify Client ID/Secret missing in api/.env');
	$ch = curl_init('https://accounts.spotify.com/api/token');
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_TIMEOUT => 10,
		CURLOPT_POST => true,
		CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
		CURLOPT_USERPWD => "$id:$secret",
	]);
	$raw = curl_exec($ch);
	$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$curlError = curl_error($ch);
	curl_close($ch);
	if ($raw === false) fail("Host could not reach Spotify: $curlError", 502);
	$token = json_decode($raw, true)['access_token'] ?? null;
	if (!$token) fail("Spotify rejected the Client ID/Secret (HTTP $httpCode: " . substr($raw, 0, 120) . ')', 502);
	return $token;
}

// Artist PROFILES for the pinned Pinay singers: one batched Get Several Artists
// call (max 50 ids). Returns [{id, name, image, followers, popularity, genres}].
function buildArtists()
{
	$auth = ["Authorization: Bearer " . spotifyToken()];
	// Dev-mode apps are refused the batched /v1/artists?ids=; one call per artist
	// (in parallel) still works. Dev mode also omits followers/popularity/genres,
	// so those come back null/empty.
	$urls = [];
	foreach (PINAY as $name => $id) $urls[$name] = "https://api.spotify.com/v1/artists/$id";
	$out = [];
	foreach (array_filter(multiGet($urls, $auth)) as $a) {
		if (empty($a['id'])) continue;
		$out[] = [
			'id' => $a['id'],
			'name' => $a['name'] ?? '',
			'image' => $a['images'][0]['url'] ?? null,
			'followers' => $a['followers']['total'] ?? null,
			'popularity' => $a['popularity'] ?? null,
			'genres' => array_slice($a['genres'] ?? [], 0, 3),
		];
	}
	if (!$out) fail('Spotify returned no artist profiles', 502);
	// most popular first (nulls last, e.g. if dev-mode hides popularity)
	usort($out, fn($x, $y) => ($y['popularity'] ?? -1) <=> ($x['popularity'] ?? -1));
	return $out;
}

// ---- main (skipped when this file is included by a test) ----
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') !== basename(__FILE__)) return;

$feed = $_GET['feed'] ?? 'home';
if (!in_array($feed, ['home', 'trending', 'artists'], true)) fail('feed must be home, trending or artists', 400);

// Snapshot mode: hosts that block outgoing connections (Freehostia free plan)
// can't call Spotify/iTunes, so build_snapshot.php runs on a PC and writes
// songs.json / artists.json next to this file. When present they are served
// as-is and Spotify is never called.
function snapshot($file)
{
	$path = __DIR__ . '/' . $file;
	return is_file($path) ? json_decode(file_get_contents($path), true) : null;
}

// Artist profiles: cached a day (they change slowly).
if ($feed === 'artists') {
	$cf = sys_get_temp_dir() . '/himig_spotify_artists_v1.json';
	$artists = snapshot('artists.json');
	if (!$artists && is_file($cf) && time() - filemtime($cf) < 24 * 3600) {
		$artists = json_decode(file_get_contents($cf), true);
	}
	if (!$artists) {
		$artists = buildArtists();
		if ($artists) file_put_contents($cf, json_encode($artists));
	}
	echo json_encode($artists);
	return;
}

$cacheFile = sys_get_temp_dir() . '/himig_spotify_pool_v2.json';
$pool = snapshot('songs.json');
if (!$pool && is_file($cacheFile) && time() - filemtime($cacheFile) < CACHE_TTL) {
	$pool = json_decode(file_get_contents($cacheFile), true);
}
if (!$pool) {
	$pool = buildPool();
	if ($pool) file_put_contents($cacheFile, json_encode($pool));
}

// ?only=<singer name> — every song we have for one singer (her profile screen).
$only = $_GET['only'] ?? '';
if ($only !== '') {
	$pool = array_values(array_filter($pool, fn($t) => $t['artist'] === $only));
	usort($pool, fn($a, $b) => strcmp($b['released'], $a['released']));
} elseif ($feed === 'trending') {
	usort($pool, fn($a, $b) => strcmp($b['released'], $a['released']));
	$pool = array_slice(capPerSinger($pool, 2), 0, 25);
} else {
	shuffle($pool);
	$pool = array_slice(capPerSinger($pool, 3), 0, 30);
}
echo json_encode(array_map(function ($t) { unset($t['released']); return $t; }, $pool));
