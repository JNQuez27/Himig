<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
include("connection.php");
include("auth.php");

//Auth Start
// $auth = new authObj();
// $isAuthorized = $auth->authenticate();
// if(!$isAuthorized)
// {
// 	header("HTTP/1.0 401");
// 	exit;
// }
//Auth End

$db = new dbObj();
$connection = $db->getConnstring();
$connection->set_charset("utf8mb4");

// ponytail: single demo user (users.id = 1) until auth is turned on; pass ?user= to switch.
$user = !empty($_GET["user"]) ? intval($_GET["user"]) : 1;

$request_method = $_SERVER["REQUEST_METHOD"];
switch($request_method)
{
	case 'GET':
		if (!empty($_GET["id"])) {
			getArtist(intval($_GET["id"]));
		} elseif (!empty($_GET["genre"])) {
			searchArtistsGenre($_GET["genre"]);
		} elseif (!empty($_GET["name"])) {
			searchArtistsName($_GET["name"]);
		} else {
			getArtists();
		}
		break;

	case 'POST':
		if (!empty($_GET["favorite"])) {
			toggleFavorite(intval($_GET["favorite"]));
			break;
		}
		$data = json_decode(file_get_contents('php://input'), true) ?: [];
		insertArtist(
			$data["name"] ?? '',
			$data["tagline"] ?? '',
			$data["era"] ?? '',
			$data["genre"] ?? '',
			$data["bio"] ?? '',
			$data["songs"] ?? []
		);
		break;

	case 'PUT':
		$id = intval($_GET["id"] ?? 0);
		$data = json_decode(file_get_contents('php://input'), true) ?: [];
		updateArtist(
			$id,
			$data["name"] ?? '',
			$data["tagline"] ?? '',
			$data["era"] ?? '',
			$data["genre"] ?? '',
			$data["bio"] ?? '',
			$data["songs"] ?? []
		);
		break;

	case 'DELETE':
		deleteArtist(intval($_GET["id"] ?? 0));
		break;

	default:
		header("HTTP/1.0 405 Method Not Implemented");
		break;
}

function respond($response, $code = 200)
{
	http_response_code($code);
	header('Content-Type: application/json');
	echo json_encode($response);
}

// Shared SELECT: artist columns + favorite/custom flags, visible to $user.
// Songs are attached afterwards as an array, matching the app's shape.
function fetchArtists($where = "", $types = "", $params = [])
{
	global $connection, $user;
	$sql = "SELECT a.id, a.name, a.tagline, a.era, a.genre, a.bio,
	               (f.user_id IS NOT NULL) AS favorite,
	               (a.owner_id IS NOT NULL) AS custom
	          FROM artists a
	          LEFT JOIN favorites f ON f.artist_id = a.id AND f.user_id = ?
	         WHERE (a.owner_id IS NULL OR a.owner_id = ?) $where
	         ORDER BY a.created_at DESC, a.name";
	$stmt = $connection->prepare($sql);
	$stmt->bind_param("ii" . $types, $user, $user, ...$params);
	$stmt->execute();
	$result = $stmt->get_result();

	$response = array();
	while ($row = $result->fetch_assoc()) {
		$row["id"] = intval($row["id"]);
		$row["favorite"] = (bool) $row["favorite"];
		$row["custom"] = (bool) $row["custom"];
		$row["songs"] = array();
		$response[$row["id"]] = $row;
	}
	if (!$response) return array();

	$ids = implode(",", array_keys($response)); // ints from the DB, safe to inline
	$songs = $connection->query("SELECT artist_id, title FROM songs WHERE artist_id IN ($ids) ORDER BY artist_id, position");
	while ($s = $songs->fetch_assoc()) {
		$response[$s["artist_id"]]["songs"][] = $s["title"];
	}
	return array_values($response);
}

function getArtists()
{
	respond(fetchArtists());
}

function getArtist($id)
{
	$rows = fetchArtists("AND a.id = ?", "i", [$id]);
	if (!$rows) {
		respond(array('status' => 0, 'status_message' => 'Artist Not Found.'), 404);
		return;
	}
	respond($rows[0]);
}

function searchArtistsGenre($genre)
{
	respond(fetchArtists("AND a.genre LIKE ?", "s", ["%" . $genre . "%"]));
}

function searchArtistsName($name)
{
	respond(fetchArtists("AND a.name LIKE ?", "s", ["%" . $name . "%"]));
}

// Songs arrive as an array of titles; replace the artist's list wholesale.
function saveSongs($artistId, $songs)
{
	global $connection;
	$del = $connection->prepare("DELETE FROM songs WHERE artist_id = ?");
	$del->bind_param("i", $artistId);
	$del->execute();

	$ins = $connection->prepare("INSERT IGNORE INTO songs (artist_id, title, position) VALUES (?, ?, ?)");
	$position = 0;
	foreach ((array) $songs as $title) {
		$title = trim((string) $title);
		if ($title === '') continue;
		$ins->bind_param("isi", $artistId, $title, $position);
		$ins->execute();
		$position++;
	}
}

function insertArtist($name, $tagline, $era, $genre, $bio, $songs)
{
	global $connection, $user;
	$name = trim($name);
	if ($name === '') {
		respond(array('status' => 0, 'status_message' => 'Name is required.'), 400);
		return;
	}
	$tagline = trim($tagline) ?: 'OPM artist';
	$era     = trim($era) ?: 'Since —';
	$genre   = trim($genre) ?: 'OPM';
	$bio     = trim($bio);

	$stmt = $connection->prepare("INSERT INTO artists (owner_id, name, tagline, era, genre, bio) VALUES (?, ?, ?, ?, ?, ?)");
	$stmt->bind_param("isssss", $user, $name, $tagline, $era, $genre, $bio);
	if ($stmt->execute())
	{
		$id = $connection->insert_id;
		saveSongs($id, $songs);
		respond(array(
			'status' => 1,
			'status_message' => 'Artist Added Successfully.',
			'id' => $id
		), 201);
	}
	else
	{
		respond(array(
			'status' => 0,
			'status_message' => 'Artist Addition Failed.'
		), 400);
	}
}

function updateArtist($id, $name, $tagline, $era, $genre, $bio, $songs)
{
	global $connection, $user;
	$name = trim($name);
	if ($name === '') {
		respond(array('status' => 0, 'status_message' => 'Name is required.'), 400);
		return;
	}
	$tagline = trim($tagline) ?: 'OPM artist';
	$era     = trim($era) ?: 'Since —';
	$genre   = trim($genre) ?: 'OPM';
	$bio     = trim($bio);

	// Only the user's own artists are editable; curated ones (owner_id NULL) are read-only.
	$check = $connection->prepare("SELECT id FROM artists WHERE id = ? AND owner_id = ?");
	$check->bind_param("ii", $id, $user);
	$check->execute();
	if (!$check->get_result()->fetch_assoc()) {
		respond(array('status' => 0, 'status_message' => 'Artist Updation Failed.'), 403);
		return;
	}

	$stmt = $connection->prepare("UPDATE artists SET name = ?, tagline = ?, era = ?, genre = ?, bio = ? WHERE id = ?");
	$stmt->bind_param("sssssi", $name, $tagline, $era, $genre, $bio, $id);
	if ($stmt->execute())
	{
		saveSongs($id, $songs);
		respond(array(
			'status' => 1,
			'status_message' => 'Artist Updated Successfully.'
		));
	}
	else
	{
		respond(array(
			'status' => 0,
			'status_message' => 'Artist Updation Failed.'
		), 400);
	}
}

function deleteArtist($id)
{
	global $connection, $user;
	// Songs and favorites go with it (ON DELETE CASCADE).
	$stmt = $connection->prepare("DELETE FROM artists WHERE id = ? AND owner_id = ?");
	$stmt->bind_param("ii", $id, $user);
	if ($stmt->execute() && $stmt->affected_rows > 0)
	{
		respond(array(
			'status' => 1,
			'status_message' => 'Artist Record Deleted.'
		));
	}
	else
	{
		respond(array(
			'status' => 0,
			'status_message' => 'Artist Deletion Failed.'
		), 400);
	}
}

function toggleFavorite($artistId)
{
	global $connection, $user;
	$del = $connection->prepare("DELETE FROM favorites WHERE user_id = ? AND artist_id = ?");
	$del->bind_param("ii", $user, $artistId);
	$del->execute();
	if ($del->affected_rows > 0) {
		respond(array('status' => 1, 'status_message' => 'Removed from Favorites.', 'favorite' => false));
		return;
	}
	$ins = $connection->prepare("INSERT INTO favorites (user_id, artist_id) VALUES (?, ?)");
	$ins->bind_param("ii", $user, $artistId);
	if ($ins->execute()) {
		respond(array('status' => 1, 'status_message' => 'Added to Favorites.', 'favorite' => true));
	} else {
		respond(array('status' => 0, 'status_message' => 'Favorite Failed.'), 400);
	}
}
?>
