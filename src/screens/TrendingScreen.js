import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { fetchTrending } from '../data/api';
import { loadTrendingCache, saveTrendingCache } from '../data/storage';
import { usePlayer } from '../context/PlayerContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function TrendingScreen({ navigation }) {
  const { play } = usePlayer();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false); // showing fresh (online) data
  const [failed, setFailed] = useState(false);

  // Auto-load: show cache first, then pull live data if the device is online.
  const load = useCallback(async () => {
    const cached = await loadTrendingCache();
    if (cached.length) setItems(cached);
    setLoading(true);
    setFailed(false);
    try {
      const fresh = await fetchTrending();
      if (fresh.length) {
        setItems(fresh);
        setLive(true);
        saveTrendingCache(fresh);
      }
    } catch {
      setLive(false);
      if (!cached.length) setFailed(true); // offline and nothing cached yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>WHAT'S HOT</Text>
          <Text style={styles.title}>Trending</Text>
        </View>
        {live && (
          <View style={styles.livePill}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.amber} />
          <Text style={styles.note}>Loading trending OPM…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyGlyph}>{'☁'}</Text>
          <Text style={styles.note}>
            {failed
              ? 'No connection. Trending songs will appear here once you’re online.'
              : 'Nothing trending right now.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.amber} />
          }
          ListHeaderComponent={
            !live && (
              <Text style={styles.cacheNote}>Saved offline · pull down to refresh</Text>
            )
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                play(items, index);
                navigation.navigate('NowPlaying');
              }}
            >
              <Text style={styles.rank}>{index + 1}</Text>
              {item.art ? (
                <Image source={{ uri: item.art }} style={styles.art} />
              ) : (
                <View style={[styles.art, styles.artFallback]}>
                  <Text style={styles.artGlyph}>{'♪'}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
              </View>
              <Text style={styles.play}>{'▶'}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm,
    marginBottom: space.sm,
  },
  eyebrow: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '900', marginTop: 2 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: radius.pill, backgroundColor: 'rgba(78,209,151,0.12)', borderWidth: 1, borderColor: colors.online,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online },
  liveText: { color: colors.online, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  emptyGlyph: { fontSize: 44, color: colors.mutedSoft },
  note: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: space.lg, paddingBottom: 110 },
  cacheNote: { color: colors.mutedSoft, fontSize: 12, marginBottom: space.sm, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  rank: { width: 26, textAlign: 'center', color: colors.amber, fontWeight: '900', fontSize: 15 },
  art: { width: 50, height: 50, borderRadius: radius.sm, marginHorizontal: space.sm },
  artFallback: { backgroundColor: colors.inkSofter, alignItems: 'center', justifyContent: 'center' },
  artGlyph: { color: colors.amber, fontSize: 20 },
  info: { flex: 1 },
  songTitle: { color: colors.cream, fontSize: 15, fontWeight: '700' },
  songArtist: { color: colors.muted, fontSize: 12, marginTop: 2 },
  play: { color: colors.amber, fontSize: 16, marginHorizontal: space.sm },
});
