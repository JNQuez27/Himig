import AsyncStorage from '@react-native-async-storage/async-storage';

// Everything the app asks the karaoke server (server/app.py).
const DEFAULT_KARAOKE_URL = process.env.EXPO_PUBLIC_KARAOKE_URL || '';
let KARAOKE_URL = DEFAULT_KARAOKE_URL;
const K_SERVER = '@himig/server_url';

// The server address can be changed in Profile, e.g. to a laptop on the same
// Wi-Fi for a party with no internet. Empty = back to the built-in address.
export const getServerUrl = () => KARAOKE_URL;
export async function loadServerUrl() {
  const saved = await AsyncStorage.getItem(K_SERVER).catch(() => null);
  if (saved) KARAOKE_URL = saved;
}
export async function setServerUrl(url) {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  KARAOKE_URL = u || DEFAULT_KARAOKE_URL;
  await (u ? AsyncStorage.setItem(K_SERVER, u) : AsyncStorage.removeItem(K_SERVER)).catch(() => {});
  return KARAOKE_URL;
}

// Server paths like /files/<id>/instrumental.mp3 -> full URL.
export const karaokeUrl = (path) => `${KARAOKE_URL}${path}`;

// Send the user's own audio file to the server to be turned into a karaoke song.
export async function uploadSong({ title, artist, file }) {
  if (!KARAOKE_URL) throw new Error('EXPO_PUBLIC_KARAOKE_URL is not set in .env');
  const body = new FormData();
  body.append('title', title);
  body.append('artist', artist);
  body.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'audio/mpeg' });
  const res = await fetch(`${KARAOKE_URL}/songs`, { method: 'POST', body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json.detail === 'string' ? json.detail : `HTTP ${res.status}`);
  return json;
}

// Rooms: created over HTTP, then everything else goes through one WebSocket.
export async function createRoom() {
  if (!KARAOKE_URL) throw new Error('EXPO_PUBLIC_KARAOKE_URL is not set in .env');
  const res = await fetch(`${KARAOKE_URL}/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export const roomSocketUrl = (code, name) =>
  `${KARAOKE_URL.replace(/^http/, 'ws')}/rooms/${code}/ws?name=${encodeURIComponent(name)}`;

// The address other devices (a TV) should use: the server reports its own
// network address, since the app may reach it as localhost.
export const fetchServerBase = () =>
  fetch(`${KARAOKE_URL}/info`).then((r) => r.json()).then((j) => j.base);

export const fetchKaraokeSong = (id) =>
  fetch(`${KARAOKE_URL}/songs/${id}`).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
  );

export async function fetchKaraokeSongs() {
  if (!KARAOKE_URL) throw new Error('EXPO_PUBLIC_KARAOKE_URL is not set in .env');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${KARAOKE_URL}/songs`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
