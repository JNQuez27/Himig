import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { loadArtists, saveArtists } from '../data/storage';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';

export function AppProvider({ children }) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setArtists(await loadArtists());
      setLoading(false);
    })();
  }, []);

  // every mutation updates state AND persists to disk (offline-first)
  const commit = useCallback((next) => {
    setArtists(next);
    saveArtists(next);
  }, []);

  const addArtist = useCallback(
    (data) => {
      const artist = {
        id: `u${Date.now()}`,
        name: data.name.trim(),
        initials: initials(data.name),
        era: data.era?.trim() || 'Since —',
        genre: data.genre?.trim() || 'OPM',
        tagline: data.tagline?.trim() || 'OPM artist',
        bio: data.bio?.trim() || '',
        songs: (data.songs || []).map((s) => s.trim()).filter(Boolean),
        favorite: false,
        custom: true,
      };
      setArtists((prev) => {
        const next = [artist, ...prev];
        saveArtists(next);
        return next;
      });
      return artist;
    },
    []
  );

  const updateArtist = useCallback((id, patch) => {
    setArtists((prev) => {
      const next = prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              initials: patch.name ? initials(patch.name) : a.initials,
              songs: patch.songs
                ? patch.songs.map((s) => s.trim()).filter(Boolean)
                : a.songs,
            }
          : a
      );
      saveArtists(next);
      return next;
    });
  }, []);

  const deleteArtist = useCallback((id) => {
    setArtists((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveArtists(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id) => {
    setArtists((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, favorite: !a.favorite } : a
      );
      saveArtists(next);
      return next;
    });
  }, []);

  const value = {
    artists,
    loading,
    addArtist,
    updateArtist,
    deleteArtist,
    toggleFavorite,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
