import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { karaokeUrl, fetchKaraokeSong } from '../data/api';

// Downloaded song packs: files in the app's private storage + a small index.
// Everything here works with no connection once a song is downloaded.
const DIR = `${FileSystem.documentDirectory}songs/`;
const KEY = '@himig/library_v1';
const PENDING = '@himig/library_pending_v1';
const RECENT = '@himig/library_recent_v1';

const LibraryContext = createContext(null);
export const useLibrary = () => useContext(LibraryContext);

// Playable form of a downloaded song (same shape the server returns, local paths).
const toLocal = (s) => ({
  ...s,
  local: true,
  instrumental: `${DIR}${s.id}/instrumental.mp3`,
  original: `${DIR}${s.id}/original.mp3`,
  lyrics: s.has_lyrics ? `${DIR}${s.id}/lyrics.lrc` : null,
});

// Works for both server paths (/files/...) and downloaded files (file://...).
export const audioUri = (path) => (path.startsWith('file:') ? path : karaokeUrl(path));
export const readLyrics = (path) =>
  path.startsWith('file:')
    ? FileSystem.readAsStringAsync(path)
    : fetch(karaokeUrl(path)).then((r) => r.text());

export function LibraryProvider({ children }) {
  const [index, setIndex] = useState([]);
  const [busy, setBusy] = useState({}); // id -> true while downloading
  // Songs the user sent to the server that are still being prepared.
  const [pending, setPending] = useState([]); // [{ id, title, artist, failed }]
  const [recent, setRecent] = useState([]); // ids of downloaded songs, last sung first

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setIndex(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(RECENT)
      .then((raw) => raw && setRecent(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(PENDING)
      .then((raw) => raw && setPending(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const save = useCallback((update) => {
    setIndex((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const download = useCallback(
    async (song) => {
      const dir = `${DIR}${song.id}/`;
      setBusy((b) => ({ ...b, [song.id]: true }));
      try {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const files = ['instrumental.mp3', 'original.mp3', ...(song.has_lyrics ? ['lyrics.lrc'] : [])];
        let bytes = 0;
        for (const name of files) {
          const res = await FileSystem.downloadAsync(karaokeUrl(`/files/${song.id}/${name}`), dir + name);
          if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
          bytes += (await FileSystem.getInfoAsync(dir + name)).size || 0;
        }
        const { id, title, artist, duration, has_lyrics, lyrics_auto } = song;
        save((prev) => [
          { id, title, artist, duration, has_lyrics, lyrics_auto, bytes },
          ...prev.filter((s) => s.id !== id),
        ]);
      } catch (e) {
        // A half-downloaded pack is useless offline, so remove it.
        await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
        throw e;
      } finally {
        setBusy((b) => {
          const { [song.id]: _, ...rest } = b;
          return rest;
        });
      }
    },
    [save]
  );

  const remove = useCallback(
    async (id) => {
      await FileSystem.deleteAsync(`${DIR}${id}/`, { idempotent: true }).catch(() => {});
      save((prev) => prev.filter((s) => s.id !== id));
    },
    [save]
  );

  const savePending = useCallback((update) => {
    setPending((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(PENDING, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const track = useCallback(
    (song) => savePending((prev) => [song, ...prev.filter((p) => p.id !== song.id)]),
    [savePending]
  );
  const dismiss = useCallback(
    (id) => savePending((prev) => prev.filter((p) => p.id !== id)),
    [savePending]
  );

  // Songs the user added download by themselves as soon as the server is done,
  // so adding a song is one step: pick the file, then find it in the Library.
  const waiting = pending.filter((p) => !p.failed).map((p) => p.id).join(',');
  useEffect(() => {
    if (!waiting) return;
    const check = async () => {
      for (const id of waiting.split(',')) {
        try {
          const song = await fetchKaraokeSong(id);
          if (song.status === 'ready') {
            await download(song);
            dismiss(id);
          } else if (song.status === 'failed') {
            savePending((prev) => prev.map((p) => (p.id === id ? { ...p, failed: true } : p)));
          }
        } catch {
          // offline or server down: keep waiting and try again
        }
      }
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [waiting, download, dismiss, savePending]);

  const markSung = useCallback((id) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
      AsyncStorage.setItem(RECENT, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = {
    markSung,
    // Recently sung songs that are still downloaded.
    recent: recent.map((id) => index.find((s) => s.id === id)).filter(Boolean).map(toLocal),
    pending,
    track,
    dismiss,
    songs: index.map(toLocal),
    bytes: index.reduce((n, s) => n + (s.bytes || 0), 0),
    has: (id) => index.some((s) => s.id === id),
    local: (id) => {
      const s = index.find((x) => x.id === id);
      return s ? toLocal(s) : null;
    },
    downloading: (id) => !!busy[id],
    download,
    remove,
  };
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
