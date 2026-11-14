import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createRoom, roomSocketUrl } from '../data/api';

// One karaoke room at a time. The server owns the room (members, queue, what is
// playing) and pushes the whole state after every change; this just mirrors it.
const RoomContext = createContext(null);
export const useRoom = () => useContext(RoomContext);

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ws = useRef(null);
  const want = useRef(null); // { code, name } while we mean to be in a room

  const open = useCallback((code, name) => {
    want.current = { code, name };
    const sock = new WebSocket(roomSocketUrl(code, name));
    ws.current = sock;
    sock.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'joined') setMe(msg.id);
      else if (msg.type === 'state') {
        setRoom(msg.room);
        setBusy(false);
      } else if (msg.type === 'error') {
        want.current = null; // e.g. wrong code: do not keep retrying
        setRoom(null); // also covers a room that ended while we were away
        setMe(null);
        setError(msg.message);
        setBusy(false);
      }
    };
    sock.onerror = () => {
      if (!want.current) return;
      setError('Cannot reach the karaoke server.');
      setBusy(false);
    };
    sock.onclose = () => {
      if (ws.current !== sock || !want.current) return;
      // Dropped connection (Wi-Fi blip, server restart): try to get back in.
      setTimeout(() => want.current && ws.current === sock && open(code, name), 2000);
    };
  }, []);

  const join = useCallback(
    (code, name) => {
      setError('');
      setBusy(true);
      open(code.trim().toUpperCase(), name.trim() || 'Guest');
    },
    [open]
  );

  const create = useCallback(
    async (name) => {
      setError('');
      setBusy(true);
      try {
        const { code } = await createRoom();
        open(code, name.trim() || 'Guest');
      } catch {
        setError('Cannot reach the karaoke server.');
        setBusy(false);
      }
    },
    [open]
  );

  const leave = useCallback(() => {
    want.current = null;
    ws.current?.close();
    ws.current = null;
    setRoom(null);
    setMe(null);
  }, []);

  const send = useCallback((msg) => {
    if (ws.current?.readyState === 1) ws.current.send(JSON.stringify(msg));
  }, []);

  useEffect(() => leave, [leave]);

  const value = {
    room,
    me,
    error,
    busy,
    isHost: !!room && room.host === me,
    // The host's phone plays the music unless a big screen (TV page) is connected.
    isPlayer: !!room && room.host === me && !room.display,
    hostName: room?.members.find((m) => m.id === room.host)?.name,
    join,
    create,
    leave,
    send,
  };
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
