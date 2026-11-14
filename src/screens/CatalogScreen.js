import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchKaraokeSongs } from '../data/api';
import { useLibrary } from '../context/LibraryContext';
import { colors, space, radius, shadow } from '../theme/colors';

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const NOTE = {
  preparing: 'Preparing karaoke version...',
  failed: 'Could not prepare this song',
};

export default function CatalogScreen({ navigation }) {
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const library = useLibrary();

  const save = (song) =>
    library.download(song).catch(() =>
      Alert.alert('Download failed', 'Check the connection to the karaoke server and try again.')
    );

  const load = useCallback(async () => {
    try {
      setSongs(await fetchKaraokeSongs());
      setError(null);
    } catch {
      setError('Cannot reach the karaoke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While a song is being prepared, check back until it is ready.
  const preparing = songs.some((s) => s.status === 'preparing');
  useEffect(() => {
    if (!preparing) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [preparing, load]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>KARAOKE</Text>
        <Text style={styles.title}>Catalog</Text>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.amber} />
        }
        renderItem={({ item }) => {
          const ready = item.status === 'ready';
          const saved = library.has(item.id);
          return (
            <View style={[styles.card, !ready && styles.dim]}>
            <Pressable
              style={styles.main}
              disabled={!ready}
              // A downloaded copy plays from the phone, not the network.
              onPress={() => navigation.navigate('Karaoke', { song: library.local(item.id) || item })}
              accessibilityRole="button"
              accessibilityLabel={`Sing ${item.title} by ${item.artist}`}
            >
              <View style={styles.avatar}>
                <Ionicons name="mic" size={22} color={colors.ink} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {ready
                    ? `${item.artist}  ·  ${fmt(item.duration)}${item.has_lyrics ? '' : '  ·  no lyrics'}`
                    : NOTE[item.status]}
                </Text>
              </View>
            </Pressable>
              {ready && (
                <Pressable
                  onPress={() => save(item)}
                  disabled={saved || library.downloading(item.id)}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? `${item.title} is downloaded` : `Download ${item.title}`}
                >
                  {library.downloading(item.id) ? (
                    <ActivityIndicator color={colors.amber} />
                  ) : (
                    <Ionicons
                      name={saved ? 'checkmark-circle' : 'cloud-download-outline'}
                      size={26}
                      color={saved ? colors.online : colors.amber}
                    />
                  )}
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="mic-outline" size={40} color={colors.mutedSoft} />
              <Text style={styles.emptyText}>
                {error || 'No songs yet. Add one from the server page.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, marginBottom: space.sm },
  eyebrow: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '900', marginTop: 2 },
  list: { paddingHorizontal: space.lg, paddingBottom: 110, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm, minHeight: 68,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  dim: { opacity: 0.55 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', marginRight: space.sm,
  },
  info: { flex: 1 },
  name: { color: colors.cream, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: space.xl, gap: space.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
