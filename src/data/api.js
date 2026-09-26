// Songs come from our PHP host (api/spotify.php), which talks to Spotify with
// the secret kept server-side and returns ONLY Filipina (Pinay) female singers.
// Only called when the user turns Online mode on; otherwise the app uses the
// offline cache. Fails soft (throws) so callers can fall back to cached data.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// First call after a cache expiry makes the server hit Spotify for ~30 artists,
// so allow more time than a normal request.
async function fetchFeed(feed, keep, ms = 20000) {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is not set in .env');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(`${API_URL}/spotify.php?feed=${feed}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error(json.status_message || 'Bad response');
    return json.filter(keep);
  } finally {
    clearTimeout(timer);
  }
}

const isTrack = (t) => t.id && t.title && t.preview;
const isArtist = (a) => a.id && a.name;

// Home: profiles of popular Pinay artists.
export const fetchArtists = () => fetchFeed('artists', isArtist);

// Trending: the most popular Pinay tracks on Spotify right now.
export const fetchTrending = () => fetchFeed('trending', isTrack);

// Every song we have for one singer (for her profile screen). Server filters
// the pool by exact singer name via ?only=<name>.
export const fetchArtistSongs = (name) =>
  fetchFeed(`home&only=${encodeURIComponent(name)}`, isTrack);

// Kept for any callers still pulling the mixed song feed.
export const fetchHomeSongs = () => fetchFeed('home', isTrack);
