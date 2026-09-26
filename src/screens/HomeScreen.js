import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchArtists } from '../data/api';
import { loadArtistFeed, saveArtistFeed } from '../data/storage';
import { colors, space, radius, shadow } from '../theme/colors';

const initials = (name) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

const fmtFollowers = (n) => {
  if (n == null) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${n}`;
};

export default function HomeScreen({ navigation }) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Popular Pinay artist profiles (Spotify via our proxy), cached for offline.
  const load = useCallback(async () => {
    const cached = await loadArtistFeed();
    if (cached.length) setArtists(cached);
    setLoading(true);
    try {
      const fresh = await fetchArtists();
      if (fresh.length) {
        setArtists(fresh);
        saveArtistFeed(fresh);
      }
    } catch {
      /* offline — keep whatever was cached */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, query]);

  const featured = filtered[0];
  const rest = featured ? filtered.slice(1) : filtered;
  const openArtist = (artist) => navigation.navigate('Artist', { artist });

  const Header = (
    <View>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>OPM SPOTLIGHT</Text>
          <Text style={styles.title}>Himig</Text>
        </View>
        <View style={styles.bell}>
          <Text style={styles.bellGlyph}>{'♪'}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchGlyph}>{'⌕'}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Pinay artists"
          placeholderTextColor={colors.mutedSoft}
          style={styles.searchInput}
        />
      </View>

      {featured && (
        <Pressable
          onPress={() => openArtist(featured)}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.95 }]}
        >
          {featured.image ? (
            <Image source={{ uri: featured.image }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, styles.fallback]}>
              <Text style={styles.fallbackText}>{initials(featured.name)}</Text>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroKicker}>MOST POPULAR</Text>
            <Text style={styles.heroName} numberOfLines={1}>{featured.name}</Text>
            {fmtFollowers(featured.followers) && (
              <Text style={styles.heroMeta}>{fmtFollowers(featured.followers)} followers</Text>
            )}
          </View>
        </Pressable>
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Popular artists</Text>
        {loading && <ActivityIndicator color={colors.amber} size="small" />}
      </View>
    </View>
  );

  return (
    <FlatList
      data={rest}
      keyExtractor={(a) => a.id}
      numColumns={2}
      columnWrapperStyle={styles.col}
      ListHeaderComponent={Header}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.amber} />
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => openArtist(item)}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.fallback]}>
              <Text style={styles.fallbackText}>{initials(item.name)}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {fmtFollowers(item.followers) ? `${fmtFollowers(item.followers)} followers` : 'Pinay artist'}
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={
        !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>{'☁'}</Text>
            <Text style={styles.emptyText}>
              {query ? 'No artist matches your search.' : 'Connect to load artists. Pull to refresh.'}
            </Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: space.lg, paddingBottom: 150 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: space.sm },
  eyebrow: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '900', marginTop: 2 },
  bell: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  bellGlyph: { color: colors.amber, fontSize: 20 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSofter,
    borderRadius: radius.md, paddingHorizontal: space.md, marginTop: space.md,
  },
  searchGlyph: { color: colors.mutedSoft, fontSize: 20, marginRight: space.sm },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.cream, fontSize: 14 },
  hero: {
    height: 200, borderRadius: radius.xl, overflow: 'hidden', marginTop: space.md,
    backgroundColor: colors.inkSoft, ...shadow.card,
  },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg,
    backgroundColor: 'rgba(19,34,40,0.62)',
  },
  heroKicker: { color: colors.amber, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroName: { color: colors.cream, fontSize: 24, fontWeight: '900', marginTop: 2 },
  heroMeta: { color: colors.muted, fontSize: 13, marginTop: 2, fontWeight: '600' },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, marginBottom: space.md,
  },
  sectionTitle: { color: colors.cream, fontSize: 18, fontWeight: '800' },
  col: { gap: space.md },
  card: {
    flex: 1, backgroundColor: colors.inkSoft, borderRadius: radius.lg, padding: space.md,
    marginBottom: space.md, alignItems: 'center', borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  avatar: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.inkSofter },
  fallback: { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  name: { color: colors.cream, fontSize: 15, fontWeight: '800', marginTop: space.sm, alignSelf: 'stretch' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2, alignSelf: 'stretch' },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: space.xl },
  emptyGlyph: { color: colors.mutedSoft, fontSize: 44, marginBottom: space.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
