import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { fetchArtistSongs } from '../data/api';
import { usePlayer } from '../context/PlayerContext';
import { colors, space, radius, shadow } from '../theme/colors';

const initials = (name) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

const fmtFollowers = (n) => {
  if (n == null) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${n}`;
};

export default function ArtistScreen({ route, navigation }) {
  const { artist } = route.params;
  const { play } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSongs(await fetchArtistSongs(artist.name));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [artist.name]);

  useEffect(() => {
    load();
  }, [load]);

  const playAt = (i) => {
    play(songs, i);
    navigation.navigate('NowPlaying');
  };

  const followers = fmtFollowers(artist.followers);

  const Header = (
    <View style={styles.header}>
      <View style={styles.bar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.cream} />
        </Pressable>
      </View>

      {artist.image ? (
        <Image source={{ uri: artist.image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.fallback]}>
          <Text style={styles.fallbackText}>{initials(artist.name)}</Text>
        </View>
      )}
      <Text style={styles.name}>{artist.name}</Text>
      {followers && <Text style={styles.followers}>{followers} followers on Spotify</Text>}

      {!!(artist.genres && artist.genres.length) && (
        <View style={styles.genreRow}>
          {artist.genres.map((g) => (
            <View key={g} style={styles.genre}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </View>
      )}

      {songs.length > 0 && (
        <Pressable onPress={() => playAt(0)} style={styles.playAll}>
          <Ionicons name="play" size={18} color={colors.ink} />
          <Text style={styles.playAllText}>Play all</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Songs</Text>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <FlatList
          data={songs}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => playAt(index)}>
              <Text style={styles.rank}>{index + 1}</Text>
              {item.art ? (
                <Image source={{ uri: item.art }} style={styles.art} />
              ) : (
                <View style={[styles.art, styles.fallback]}>
                  <Text style={styles.artGlyph}>{'♪'}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.songAlbum} numberOfLines={1}>{item.album || artist.name}</Text>
              </View>
              <Text style={styles.play}>{'▶'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.amber} />
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>
                  {failed ? 'Couldn’t load songs. Check your connection.' : 'No songs found for this artist.'}
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  list: { paddingHorizontal: space.lg, paddingBottom: 120 },
  header: { alignItems: 'center' },
  bar: { alignSelf: 'stretch', flexDirection: 'row', paddingTop: space.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 150, height: 150, borderRadius: 75, marginTop: space.sm, backgroundColor: colors.inkSofter, ...shadow.card },
  fallback: { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.ink, fontSize: 44, fontWeight: '900' },
  name: { color: colors.cream, fontSize: 26, fontWeight: '900', marginTop: space.md, textAlign: 'center' },
  followers: { color: colors.muted, fontSize: 13, marginTop: 4, fontWeight: '600' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', marginTop: space.sm },
  genre: { backgroundColor: colors.inkSofter, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  genreText: { color: colors.teal, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  playAll: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.amber,
    borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 28, marginTop: space.lg,
  },
  playAllText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  sectionTitle: { color: colors.cream, fontSize: 18, fontWeight: '800', alignSelf: 'flex-start', marginTop: space.xl, marginBottom: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.hairline,
  },
  rank: { width: 24, textAlign: 'center', color: colors.mutedSoft, fontWeight: '800', fontSize: 13 },
  art: { width: 48, height: 48, borderRadius: radius.sm, marginHorizontal: space.sm },
  artGlyph: { color: colors.amber, fontSize: 18 },
  info: { flex: 1 },
  songTitle: { color: colors.cream, fontSize: 15, fontWeight: '700' },
  songAlbum: { color: colors.muted, fontSize: 12, marginTop: 2 },
  play: { color: colors.amber, fontSize: 16, marginHorizontal: space.sm },
  center: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: space.xl },
});
