"""Karaoke rooms: people join by code, share one queue, and control playback together.

Everyone is in the same place, so no voice is sent: the server only keeps the
room state and pushes it to every member over a WebSocket after each change.

ponytail: rooms live in memory, so a server restart ends every room. Move them
to SQLite if rooms must survive restarts.
"""
import secrets
import time

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

router = APIRouter()
rooms = {}
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # no I or O: easy to read out loud
EMPTY_TTL = 600  # an empty room is kept this long so people can reconnect
MAX_MEMBERS, MAX_QUEUE = 30, 100


def public(room):
    host = next(iter(room["members"]), None)
    return {
        "code": room["code"],
        "members": [{"id": m, "name": n} for m, n in room["members"].items()],
        "host": host,  # the host's phone plays the audio, unless a big screen is connected
        "display": bool(room["displays"]),  # a TV page is open and plays the audio
        "queue": room["queue"],
        "current": room["current"],
        "playing": room["playing"],
    }


def advance(room):
    room["current"] = room["queue"].pop(0) if room["queue"] else None
    room["playing"] = room["current"] is not None


def apply(room, name, msg, find_song):
    """Change the room for one message. Returns False if the message is ignored."""
    kind = msg.get("type")
    if kind == "add":
        song = find_song(str(msg.get("song_id", "")))
        if not song or song["status"] != "ready" or len(room["queue"]) >= MAX_QUEUE:
            return False
        room["queue"].append({"qid": secrets.token_hex(4), "song": song, "singer": name})
        if room["current"] is None:
            advance(room)
    elif kind == "remove":
        before = len(room["queue"])
        room["queue"] = [q for q in room["queue"] if q["qid"] != msg.get("qid")]
        return len(room["queue"]) != before
    elif kind == "next":
        # `qid` says which song the sender saw end, so two phones reporting the
        # same ending cannot skip two songs.
        if msg.get("qid") and (room["current"] or {}).get("qid") != msg["qid"]:
            return False
        advance(room)
    elif kind in ("play", "pause"):
        if room["current"] is None:
            return False
        room["playing"] = kind == "play"
    else:
        return False
    return True


async def broadcast(room):
    state = {"type": "state", "room": public(room)}
    for ws in list(room["sockets"].values()):
        try:
            await ws.send_json(state)
        except Exception:
            pass  # that socket's own handler removes it


@router.post("/rooms", status_code=201)
def create_room():
    now = time.time()
    for code in [c for c, r in rooms.items() if r["empty_since"] and now - r["empty_since"] > EMPTY_TTL]:
        del rooms[code]
    code = "".join(secrets.choice(CODE_CHARS) for _ in range(4))
    while code in rooms:
        code = "".join(secrets.choice(CODE_CHARS) for _ in range(4))
    rooms[code] = {"code": code, "members": {}, "sockets": {}, "displays": set(), "queue": [],
                   "current": None, "playing": False, "empty_since": now}
    return {"code": code}


@router.get("/rooms/{code}")
def get_room(code: str):
    room = rooms.get(code.upper())
    if not room:
        raise HTTPException(404, "Room not found")
    return public(room)


def make_ws(find_song):
    @router.websocket("/rooms/{code}/ws")
    async def room_ws(ws: WebSocket, code: str, name: str = "Guest", display: int = 0):
        room = rooms.get(code.upper())
        name = name.strip()[:30] or "Guest"
        await ws.accept()
        if not room or len(room["members"]) >= MAX_MEMBERS:
            await ws.send_json({"type": "error", "message": "Room not found" if not room else "Room is full"})
            await ws.close()
            return
        me = secrets.token_hex(4)
        if display:  # a big screen: shows and plays, but is not a singer
            room["displays"].add(me)
            name = "TV"
        else:
            room["members"][me] = name
        room["sockets"][me] = ws
        room["empty_since"] = None
        await ws.send_json({"type": "joined", "id": me})
        await broadcast(room)
        try:
            while True:
                msg = await ws.receive_json()
                if isinstance(msg, dict) and apply(room, name, msg, find_song):
                    await broadcast(room)
        except (WebSocketDisconnect, ValueError):
            pass
        finally:
            room["members"].pop(me, None)
            room["displays"].discard(me)
            room["sockets"].pop(me, None)
            if not room["members"] and not room["displays"]:
                room["empty_since"] = time.time()
                room["playing"] = False
            await broadcast(room)

    return room_ws


if __name__ == "__main__":  # self-check: python rooms.py
    song = {"id": "s1", "status": "ready", "title": "T"}
    find = lambda i: song if i == "s1" else None
    r = {"code": "ABCD", "members": {"a": "Ana"}, "sockets": {}, "displays": set(), "queue": [], "current": None,
         "playing": False, "empty_since": None}
    assert apply(r, "Ana", {"type": "add", "song_id": "s1"}, find) and r["current"] and r["playing"]
    assert not apply(r, "Ana", {"type": "add", "song_id": "nope"}, find)
    apply(r, "Ben", {"type": "add", "song_id": "s1"}, find)
    first = r["current"]["qid"]
    assert apply(r, "Ana", {"type": "next", "qid": first}, find) and r["current"]["singer"] == "Ben"
    assert not apply(r, "Ana", {"type": "next", "qid": first}, find)  # duplicate "ended" ignored
    assert apply(r, "Ana", {"type": "pause"}, find) and not r["playing"]
    assert apply(r, "Ana", {"type": "next"}, find) and r["current"] is None and not r["playing"]
    assert not apply(r, "Ana", {"type": "play"}, find) and not apply(r, "Ana", {"type": "hack"}, find)
    assert public(r)["host"] == "a" and public(r)["display"] is False
    print("rooms ok")
