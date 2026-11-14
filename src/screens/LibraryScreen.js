import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibrary, mb } from '../context/LibraryContext';
import { colors, space, radius, shadow } from '../theme/colors';

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// Downloaded songs. Everything on this screen works with no connection.
export default function LibraryScreen({ navigation }) {
  const { songs, bytes, remove, pending, dismiss } = useLibrary();

  const confirmDelete = (s) =>
    Alert.alert('Delete download', `Remove "${s.title}" from this phone? You can download it again later.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(s.id) },
    ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {songs.length ? `OFFLINE  ·  ${mb(bytes)}` : 'OFFLINE'}
          </Text>
          <Text style={styles.title}>Library</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('AddSong')}
          style={styles.addBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add your own song"
        >
          <Ionicons name="add" size={22} color={colors.ink} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {pending.map((p) => (
              <View key={p.id} style={[styles.card, styles.pending]}>
                <View style={[styles.avatar, { backgroundColor: colors.inkSofter }]}>
                  {p.failed ? (
                    <Ionicons name="alert-circle" size={22} color={colors.danger} />
                  ) : (
                    <ActivityIndicator color={colors.amber} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {p.failed ? 'Could not prepare this song' : 'Removing vocals, about 4 minutes...'}
                  </Text>
                </View>
                {p.failed && (
                  <Pressable
                    onPress={() => dismiss(p.id)}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss ${p.title}`}
                  >
                    <Ionicons name="close" size={20} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            ))}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={styles.main}
              onPress={() => navigation.navigate('Karaoke', { song: item })}
              accessibilityRole="button"
              accessibilityLabel={`Sing ${item.title} by ${item.artist}`}
            >
              <View style={styles.avatar}>
                <Ionicons name="mic" size={22} color={colors.ink} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {`${item.artist}  ·  ${fmt(item.duration)}  ·  ${mb(item.bytes)}`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          pending.length ? null : (
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={40} color={colors.mutedSoft} />
            <Text style={styles.emptyText}>
              No songs yet. Tap Add to turn a song on your phone into karaoke, or download one
              from the Catalog.
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
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm,
    marginBottom: space.sm,
  },
  eyebrow: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '900', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.amber,
    borderRadius: radius.pill, minHeight: 44, paddingHorizontal: 16,
  },
  addText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  list: { paddingHorizontal: space.lg, paddingBottom: 110, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm, minHeight: 68,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  pending: { borderStyle: 'dashed' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center', marginRight: space.sm,
  },
  info: { flex: 1 },
  name: { color: colors.cream, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: space.xl, gap: space.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
