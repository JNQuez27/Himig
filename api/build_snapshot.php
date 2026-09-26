<?php
// Builds songs.json + artists.json on YOUR PC (which can reach Spotify/iTunes),
// for hosts that block outgoing connections. Upload the two .json files next
// to spotify.php. Rerun + re-upload whenever you want fresh songs.
//
//   C:\xampp\php\php.exe build_snapshot.php
//
// Do NOT upload this file (it's also refused when opened in a browser).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/spotify.php'; // functions only; its web handler is skipped when included

$songs = buildPool();
file_put_contents(__DIR__ . '/songs.json', json_encode($songs));
$singers = count(array_unique(array_column($songs, 'artist')));
echo "songs.json:   " . count($songs) . " playable songs from $singers singers\n";

if (function_exists('buildArtists')) {
	$artists = buildArtists();
	file_put_contents(__DIR__ . '/artists.json', json_encode($artists));
	echo "artists.json: " . count($artists) . " artist profiles\n";
}
echo "Upload songs.json and artists.json to the same folder as spotify.php.\n";
