import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../context/PlayerContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function MiniPlayer({ navigation }) {
  const insets = useSafeAreaInsets();
  const { current, isPlaying, toggle, duration, position } = usePlayer();
  if (!current) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('NowPlaying')}
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 78 }]}
    >
      <View style={styles.bar}>
        {current.art ? (
          <Image source={{ uri: current.art }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artFallback]}>
            <Ionicons name="musical-notes" size={18} color={colors.ink} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{current.artist}</Text>
        </View>
        <Pressable onPress={toggle} hitSlop={10} style={styles.play}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md },
  bar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSofter,
    borderRadius: radius.lg, padding: space.sm, borderWidth: 1, borderColor: colors.hairline,
    ...shadow.card,
  },
  art: { width: 40, height: 40, borderRadius: radius.sm },
  artFallback: { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginHorizontal: space.sm },
  title: { color: colors.cream, fontSize: 14, fontWeight: '700' },
  artist: { color: colors.muted, fontSize: 12, marginTop: 1 },
  play: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.online,
    alignItems: 'center', justifyContent: 'center',
  },
  track: {
    height: 3, marginHorizontal: space.md, marginTop: -2, borderRadius: 2,
    backgroundColor: 'rgba(245,238,210,0.12)', overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.online },
});
