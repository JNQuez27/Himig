<?php
// Himig API — single entry point. Drop this folder in C:\xampp\htdocs\
// so it serves at http://localhost/api/api.php. Import ../database/himig.sql first.
//
// Routes (?r=):
//   GET    artists&user=1              list artists + songs + favorite flag
//   POST   artists&user=1              create   {name,tagline,era,genre,bio,songs:[]}
//   PUT    artists&id=9&user=1         update   (same body, all fields optional)
//   DELETE artists&id=9&user=1         delete
//   POST   favorite&id=3&user=1        toggle favorite
//   GET    tracks&feed=home|trending   cached feed
//   POST   tracks&feed=home            replace cached feed (body: array of tracks)
//   POST   login                       {username,password}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// DB credentials come from api/.env (git-ignored and web-blocked), with local
// XAMPP defaults so a fresh clone still runs. Set DB_* in api/.env on a real host.
function himig_env($path) {
    $env = [];
    foreach (@file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim(trim($v), "\"'");
    }
    return $env;
}
$env    = himig_env(__DIR__ . '/.env');
$dbHost = $env['DB_HOST'] ?? 'localhost';
$dbName = $env['DB_NAME'] ?? 'himig';
$dbUser = $env['DB_USER'] ?? 'root';
$dbPass = $env['DB_PASS'] ?? '';
$db = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$route  = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$user   = isset($_GET['user']) ? (int) $_GET['user'] : 1;
$body   = json_decode(file_get_contents('php://input'), true) ?: [];

function fail($msg, $code = 400) {
    http_response_code($code);
    exit(json_encode(['error' => $msg]));
}
function ok($data) { exit(json_encode($data)); }

// Songs arrive as an array of titles; rewrite them wholesale (small lists).
function put_songs(PDO $db, int $artistId, array $titles) {
    $db->prepare('DELETE FROM songs WHERE artist_id = ?')->execute([$artistId]);
    $ins = $db->prepare('INSERT INTO songs (artist_id, title, position) VALUES (?, ?, ?)');
    $pos = 0;
    foreach ($titles as $t) {
        $t = trim((string) $t);
        if ($t !== '') $ins->execute([$artistId, $t, $pos++]);
    }
}

try {
    switch ("$method $route") {

    case 'GET artists': {
        $rows = $db->prepare(
            'SELECT a.*, (f.user_id IS NOT NULL) AS favorite, (a.owner_id IS NOT NULL) AS custom
               FROM artists a
               LEFT JOIN favorites f ON f.artist_id = a.id AND f.user_id = :u
              WHERE a.owner_id IS NULL OR a.owner_id = :u
              ORDER BY a.created_at DESC, a.name'
        );
        $rows->execute([':u' => $user]);
        $artists = $rows->fetchAll();

        $songs = $db->prepare(
            'SELECT s.artist_id, s.title FROM songs s
               JOIN artists a ON a.id = s.artist_id
              WHERE a.owner_id IS NULL OR a.owner_id = :u
              ORDER BY s.artist_id, s.position'
        );
        $songs->execute([':u' => $user]);
        $byArtist = [];
        foreach ($songs->fetchAll() as $s) $byArtist[$s['artist_id']][] = $s['title'];

        foreach ($artists as &$a) {
            $a['id']       = (int) $a['id'];
            $a['favorite'] = (bool) $a['favorite'];
            $a['custom']   = (bool) $a['custom'];
            $a['songs']    = $byArtist[$a['id']] ?? [];
        }
        ok($artists);
    }

    case 'POST artists': {
        $name = trim($body['name'] ?? '');
        if ($name === '') fail('Name is required.');
        $st = $db->prepare(
            'INSERT INTO artists (owner_id, name, tagline, era, genre, bio)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $st->execute([
            $user, $name,
            trim($body['tagline'] ?? '') ?: 'OPM artist',
            trim($body['era']     ?? '') ?: 'Since —',
            trim($body['genre']   ?? '') ?: 'OPM',
            trim($body['bio']     ?? ''),
        ]);
        $newId = (int) $db->lastInsertId();
        put_songs($db, $newId, $body['songs'] ?? []);
        http_response_code(201);
        ok(['id' => $newId]);
    }

    case 'PUT artists': {
        if (!$id) fail('id is required.');
        $owned = $db->prepare('SELECT 1 FROM artists WHERE id = ? AND owner_id = ?');
        $owned->execute([$id, $user]);
        if (!$owned->fetch()) fail('Not your artist.', 403);

        $sets = [];
        $vals = [];
        foreach (['name', 'tagline', 'era', 'genre', 'bio'] as $f) {
            if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $vals[] = trim($body[$f]); }
        }
        if ($sets) {
            $vals[] = $id;
            $db->prepare('UPDATE artists SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        }
        if (array_key_exists('songs', $body)) put_songs($db, $id, $body['songs']);
        ok(['updated' => $id]);
    }

    case 'DELETE artists': {
        if (!$id) fail('id is required.');
        $st = $db->prepare('DELETE FROM artists WHERE id = ? AND owner_id = ?');
        $st->execute([$id, $user]);
        if (!$st->rowCount()) fail('Not your artist.', 403);
        ok(['deleted' => $id]);
    }

    case 'POST favorite': {
        if (!$id) fail('id is required.');
        $st = $db->prepare('DELETE FROM favorites WHERE user_id = ? AND artist_id = ?');
        $st->execute([$user, $id]);
        if ($st->rowCount()) ok(['favorite' => false]);
        $db->prepare('INSERT INTO favorites (user_id, artist_id) VALUES (?, ?)')->execute([$user, $id]);
        ok(['favorite' => true]);
    }

    case 'GET tracks': {
        $feed = $_GET['feed'] ?? 'home';
        $st = $db->prepare('SELECT * FROM tracks WHERE feed = ? ORDER BY fetched_at DESC');
        $st->execute([$feed]);
        ok(array_map(fn($t) => [
            'id'      => (string) $t['itunes_id'],
            'title'   => $t['title'],
            'artist'  => $t['artist_name'],
            'album'   => $t['album'],
            'art'     => $t['artwork_url'],
            'preview' => $t['preview_url'],
        ], $st->fetchAll()));
    }

    case 'POST tracks': {
        $feed = $_GET['feed'] ?? 'home';
        if (!in_array($feed, ['home', 'trending'], true)) fail('Unknown feed.');
        $db->beginTransaction();
        $db->prepare('DELETE FROM tracks WHERE feed = ?')->execute([$feed]);
        $ins = $db->prepare(
            'INSERT INTO tracks (itunes_id, feed, title, artist_name, album, artwork_url, preview_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($body as $t) {
            if (empty($t['id']) || empty($t['preview'])) continue;
            $ins->execute([
                (int) $t['id'], $feed, $t['title'] ?? '', $t['artist'] ?? '',
                $t['album'] ?? null, $t['art'] ?? null, $t['preview'],
            ]);
        }
        $db->commit();
        ok(['cached' => count($body)]);
    }

    case 'POST login': {
        $st = $db->prepare('SELECT id, username, display_name, password_hash FROM users WHERE username = ?');
        $st->execute([trim($body['username'] ?? '')]);
        $u = $st->fetch();
        if (!$u || !password_verify($body['password'] ?? '', $u['password_hash'])) {
            fail('Invalid username or password.', 401);
        }
        unset($u['password_hash']);
        $u['id'] = (int) $u['id'];
        ok($u);
    }

    default:
        fail('Unknown route.', 404);
    }
} catch (PDOException $e) {
    fail('Database error: ' . $e->getMessage(), 500);
}
