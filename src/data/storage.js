import AsyncStorage from '@react-native-async-storage/async-storage';

const K_ARTISTS = '@himig/artists';
const K_TRENDING = '@himig/trending_cache_v2';
const K_HOME = '@himig/home_cache_v2';
const K_ARTIST_FEED = '@himig/artist_feed_v1';

async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort; offline device storage can occasionally fail
  }
}

// Artist library is the user's own (starts empty; managed via CRUD on Music tab).
export const loadArtists = () => readJSON(K_ARTISTS, []);
export const saveArtists = (artists) => writeJSON(K_ARTISTS, artists);

// Cached songs so Home/Trending still show content offline after the first fetch.
export const loadTrendingCache = () => readJSON(K_TRENDING, []);
export const saveTrendingCache = (items) => writeJSON(K_TRENDING, items);

export const loadHomeCache = () => readJSON(K_HOME, []);
export const saveHomeCache = (items) => writeJSON(K_HOME, items);

// Popular Pinay artist profiles for the Home grid (cached for offline).
export const loadArtistFeed = () => readJSON(K_ARTIST_FEED, []);
export const saveArtistFeed = (items) => writeJSON(K_ARTIST_FEED, items);
