import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { usePlayer } from '../context/PlayerContext';
import { colors, space, radius, shadow } from '../theme/colors';

const BARS = 44;
const fmt = (ms) => {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function NowPlayingScreen({ navigation }) {
  const { current, isPlaying, position, duration, toggle, next, prev } = usePlayer();

  // stable pseudo-waveform so bars don't jump every render
  const heights = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 0.35 + 0.6 * Math.abs(Math.sin(i * 1.7))),
    []
  );
  const progress = duration > 0 ? position / duration : 0;

  if (!current) return null;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.bar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={22} color={colors.cream} />
          </Pressable>
          <Text style={styles.barTitle}>Now Playing</Text>
          <View style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.cream} />
          </View>
        </View>

        <View style={styles.artWrap}>
          <View style={styles.ring}>
            {current.art ? (
              <Image source={{ uri: current.art }} style={styles.art} />
            ) : (
              <View style={[styles.art, styles.artFallback]}>
                <Ionicons name="musical-notes" size={72} color={colors.ink} />
              </View>
            )}
            <Pressable onPress={toggle} style={styles.artPlay}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={colors.cream} />
            </Pressable>
          </View>
        </View>

        <View style={styles.meta}>
          <Ionicons name="list" size={20} color={colors.muted} style={{ marginRight: space.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>by {current.artist}</Text>
          </View>
        </View>

        <View style={styles.waveRow}>
          {heights.map((h, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                { height: 40 * h, backgroundColor: i / BARS <= progress ? colors.online : colors.inkSofter },
              ]}
            />
          ))}
        </View>
        <View style={styles.times}>
          <Text style={styles.time}>{fmt(position)}</Text>
          <Text style={styles.time}>{fmt(duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Ionicons name="shuffle" size={22} color={colors.muted} />
          <Pressable onPress={prev} hitSlop={10}>
            <Ionicons name="play-skip-back" size={28} color={colors.cream} />
          </Pressable>
          <Pressable onPress={toggle} style={styles.bigBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={colors.ink} />
          </Pressable>
          <Pressable onPress={next} hitSlop={10}>
            <Ionicons name="play-skip-forward" size={28} color={colors.cream} />
          </Pressable>
          <Ionicons name="repeat" size={22} color={colors.muted} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: space.lg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm },
  barTitle: { color: colors.cream, fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  artWrap: { alignItems: 'center', marginTop: space.lg, marginBottom: space.xl },
  ring: {
    width: 268, height: 268, borderRadius: 134, borderWidth: 4, borderColor: colors.online,
    padding: 8, alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  art: { width: '100%', height: '100%', borderRadius: 130 },
  artFallback: { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  artPlay: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(19,34,40,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  title: { color: colors.cream, fontSize: 22, fontWeight: '900' },
  artist: { color: colors.muted, fontSize: 13, marginTop: 3 },
  waveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  waveBar: { width: 4, borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  time: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.xl, paddingHorizontal: space.sm,
  },
  bigBtn: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: colors.online,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
});
