import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Audio } from 'expo-av';

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

// Local artist songs have no audio file, so they play a short bundled demo clip
// (works fully offline). Trending songs carry a real 30s preview URL (online).
const DEMO = require('../assets/demo.wav');
const sourceFor = (track) => (track?.preview ? { uri: track.preview } : DEMO);

export function PlayerProvider({ children }) {
  const soundRef = useRef(null);
  const queueRef = useRef([]);
  const indexRef = useRef(0);
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadAt = useCallback(async (list, i) => {
    const track = list[i];
    if (!track) return;
    queueRef.current = list;
    indexRef.current = i;
    setCurrent(track);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        sourceFor(track),
        { shouldPlay: true },
        (st) => {
          if (!st.isLoaded) return;
          setIsPlaying(st.isPlaying);
          setPosition(st.positionMillis || 0);
          setDuration(st.durationMillis || 0);
          if (st.didJustFinish) skip(1);
        }
      );
      soundRef.current = sound;
    } catch {
      setIsPlaying(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = useCallback(
    (dir) => {
      const q = queueRef.current;
      if (q.length === 0) return;
      const n = (indexRef.current + dir + q.length) % q.length;
      loadAt(q, n);
    },
    [loadAt]
  );

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  const play = useCallback((list, i = 0) => loadAt(list, i), [loadAt]);

  const toggle = useCallback(async () => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) await s.pauseAsync();
    else await s.playAsync();
  }, []);

  const seek = useCallback(async (millis) => {
    const s = soundRef.current;
    if (s) await s.setPositionAsync(Math.max(0, millis));
  }, []);

  const value = {
    current,
    isPlaying,
    position,
    duration,
    hasTrack: !!current,
    play,
    toggle,
    next: () => skip(1),
    prev: () => skip(-1),
    seek,
  };
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
