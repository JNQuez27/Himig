"""Himig karaoke server: prepares songs (vocals removed + synced lyrics) and serves them.

Run:  .venv/Scripts/python -m uvicorn app:app --host 0.0.0.0 --port 8000
Then open http://localhost:8000 to add a song.
"""
import io
import json
import shutil
import socket
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

import rooms

ROOT = Path(__file__).parent / "data"
SONGS = ROOT / "songs"
SONGS.mkdir(parents=True, exist_ok=True)
DB = ROOT / "himig.db"
AUDIO_EXT = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac"}
MAX_BYTES = 50 * 1024 * 1024
SR = 44100  # demucs-onnx works at 44.1 kHz

# ponytail: one worker, songs queue up. Separation uses every core anyway;
# add workers only if this moves to a bigger machine.
jobs = ThreadPoolExecutor(max_workers=1)
app = FastAPI(title="Himig Karaoke")
app.mount("/files", StaticFiles(directory=SONGS), name="files")


def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


with db() as _c:
    _c.execute(
        "CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL,"
        " artist TEXT NOT NULL, duration REAL DEFAULT 0, status TEXT NOT NULL,"
        " error TEXT, has_lyrics INTEGER DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    if "lyrics_auto" not in [r[1] for r in _c.execute("PRAGMA table_info(songs)")]:
        _c.execute("ALTER TABLE songs ADD COLUMN lyrics_auto INTEGER DEFAULT 0")
    # A restart loses queued jobs, so anything left mid-prepare is marked failed.
    _c.execute("UPDATE songs SET status='failed', error='Server restarted' WHERE status='preparing'")


def update(song_id, **fields):
    sets = ", ".join(f"{k}=?" for k in fields)
    with db() as con:
        con.execute(f"UPDATE songs SET {sets} WHERE id=?", (*fields.values(), song_id))


def song_json(row):
    s = dict(row)
    ready = s["status"] == "ready"
    base = f"/files/{s['id']}"
    s["has_lyrics"] = bool(s["has_lyrics"])
    s["lyrics_auto"] = bool(s["lyrics_auto"])  # transcribed by us, may have mistakes
    s["original"] = f"{base}/original.mp3" if ready else None
    s["instrumental"] = f"{base}/instrumental.mp3" if ready else None
    s["lyrics"] = f"{base}/lyrics.lrc" if ready and s["has_lyrics"] else None
    return s


def fetch_lyrics(title, artist, duration):
    """Synced lyrics (LRC text) from LRCLIB, or None."""
    def get(path, params):
        url = f"https://lrclib.net/api/{path}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Himig/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r)

    q = {"track_name": title, "artist_name": artist}
    try:
        try:
            hit = get("get", {**q, "duration": round(duration)})
            if hit.get("syncedLyrics"):
                return hit["syncedLyrics"]
        except urllib.error.HTTPError:
            pass  # 404 = no exact match; fall through to search
        for hit in get("search", q):
            if hit.get("syncedLyrics") and abs((hit.get("duration") or 0) - duration) < 5:
                return hit["syncedLyrics"]
    except Exception:
        pass  # offline or LRCLIB down: the song still works, just without lyrics
    return None


def prepare(song_id, src, title, artist):
    try:
        import demucs_onnx

        stems = demucs_onnx.separate(src, None, model="htdemucs", providers="cpu", progress=False)
        instrumental = stems["drums"] + stems["bass"] + stems["other"]
        out = SONGS / song_id
        # Both files come from the same arrays, so they are sample-aligned and
        # the app can switch between them mid-song.
        demucs_onnx.write_mp3(out / "instrumental.mp3", instrumental, SR)
        demucs_onnx.write_mp3(out / "original.mp3", instrumental + stems["vocals"], SR)
        duration = instrumental.shape[-1] / SR
        lrc = fetch_lyrics(title, artist, duration)
        auto = False
        if not lrc:
            # No published lyrics: transcribe the isolated vocals instead.
            try:
                import transcribe

                demucs_onnx.write_mp3(out / "vocals.mp3", stems["vocals"], SR)
                lrc = transcribe.lyrics_from_vocals(out / "vocals.mp3")
                auto = bool(lrc)
            except Exception:
                lrc = None  # the song is still usable without lyrics
            (out / "vocals.mp3").unlink(missing_ok=True)
        if lrc:
            (out / "lyrics.lrc").write_text(lrc, encoding="utf-8")
        Path(src).unlink(missing_ok=True)
        update(song_id, status="ready", duration=duration, has_lyrics=int(bool(lrc)), lyrics_auto=int(auto))
    except Exception as e:
        update(song_id, status="failed", error=str(e)[:300])


@app.get("/songs")
def list_songs():
    with db() as con:
        return [song_json(r) for r in con.execute("SELECT * FROM songs ORDER BY created DESC")]


@app.post("/songs", status_code=202)
def add_song(title: str = Form(...), artist: str = Form(...), file: UploadFile = File(...)):
    title, artist = title.strip()[:200], artist.strip()[:200]
    ext = Path(file.filename or "").suffix.lower()
    if not title or not artist:
        raise HTTPException(400, "Title and artist are required")
    if ext not in AUDIO_EXT:
        raise HTTPException(400, f"Unsupported file type. Use one of: {', '.join(sorted(AUDIO_EXT))}")
    song_id = uuid.uuid4().hex
    folder = SONGS / song_id
    folder.mkdir()
    src = folder / f"source{ext}"  # the uploaded filename is never used as a path
    size = 0
    with src.open("wb") as f:
        while chunk := file.file.read(1 << 20):
            size += len(chunk)
            if size > MAX_BYTES:
                f.close()
                shutil.rmtree(folder)
                raise HTTPException(413, "File is larger than 50 MB")
            f.write(chunk)
    with db() as con:
        con.execute("INSERT INTO songs (id, title, artist, status) VALUES (?,?,?,'preparing')",
                    (song_id, title, artist))
    jobs.submit(prepare, song_id, str(src), title, artist)
    return {"id": song_id, "status": "preparing"}


def _row(song_id):
    with db() as con:
        row = con.execute("SELECT * FROM songs WHERE id=?", (song_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Song not found")
    return row


@app.get("/songs/{song_id}")
def get_song(song_id: str):
    return song_json(_row(song_id))


@app.put("/songs/{song_id}/lyrics")
def set_lyrics(song_id: str, lrc: str = Body(..., media_type="text/plain", max_length=100_000)):
    """Paste-your-own lyrics, for songs LRCLIB does not have."""
    _row(song_id)
    (SONGS / song_id / "lyrics.lrc").write_text(lrc, encoding="utf-8")
    update(song_id, has_lyrics=1, lyrics_auto=0)
    return song_json(_row(song_id))


@app.delete("/songs/{song_id}", status_code=204)
def delete_song(song_id: str):
    row = _row(song_id)
    if row["status"] == "preparing":
        raise HTTPException(409, "Song is still being prepared")
    shutil.rmtree(SONGS / row["id"], ignore_errors=True)
    with db() as con:
        con.execute("DELETE FROM songs WHERE id=?", (row["id"],))


def _find_song(song_id):
    with db() as con:
        row = con.execute("SELECT * FROM songs WHERE id=?", (song_id,)).fetchone()
    return song_json(row) if row else None


rooms.make_ws(_find_song)
app.include_router(rooms.router)


HERE = Path(__file__).parent


def lan_ip():
    """This computer's address on the local network (works with no internet)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no packet is sent; it only picks the interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def public_base(request: Request):
    """Address other devices can reach us on. A TV opened as localhost would
    otherwise show a QR code that points phones at themselves."""
    host, port = request.url.hostname, request.url.port or 80
    if host in ("localhost", "127.0.0.1", "::1"):
        host = lan_ip()
    return f"http://{host}:{port}"


@app.get("/rooms/{code}/qr.svg")
def room_qr(code: str, request: Request):
    """QR code that opens the phone remote for this room."""
    import segno

    if code.upper() not in rooms.rooms:
        raise HTTPException(404, "Room not found")
    out = io.BytesIO()
    segno.make(f"{public_base(request)}/join?room={code.upper()}", error="m").save(
        out, kind="svg", scale=8, border=2, dark="#132228", light="#F5EED2")
    return Response(out.getvalue(), media_type="image/svg+xml")


@app.get("/info")
def info(request: Request):
    return {"base": public_base(request)}


@app.get("/tv", response_class=HTMLResponse)
def tv_page():
    return (HERE / "tv.html").read_text(encoding="utf-8")


@app.get("/join", response_class=HTMLResponse)
def join_page():
    return (HERE / "join.html").read_text(encoding="utf-8")


@app.on_event("startup")
def _banner():
    base = f"http://{lan_ip()}:8000"
    print(f"\n  Himig karaoke server\n  Big screen:  {base}/tv\n  Add songs:   {base}/\n"
          f"  App server address (Profile): {base}\n", flush=True)


@app.get("/", response_class=HTMLResponse)
def upload_page():
    return (Path(__file__).parent / "upload.html").read_text(encoding="utf-8")
