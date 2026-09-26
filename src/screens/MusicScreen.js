import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function MusicScreen({ navigation }) {
  const { artists, deleteArtist, toggleFavorite } = useApp();

  const confirmDelete = (a) =>
    Alert.alert('Delete artist', `Remove ${a.name} from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteArtist(a.id) },
    ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>YOUR LIBRARY</Text>
          <Text style={styles.title}>Singers & Music</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('ArtistForm', {})}
          style={styles.addBtn}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={colors.ink} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={artists}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={styles.main}
              onPress={() => navigation.navigate('Detail', { id: item.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.genre} numberOfLines={1}>{item.genre}</Text>
              </View>
            </Pressable>

            <View style={styles.actions}>
              <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={8} style={styles.iconBtn}>
                <Ionicons
                  name={item.favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={item.favorite ? colors.danger : colors.mutedSoft}
                />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ArtistForm', { id: item.id })}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Ionicons name="create-outline" size={20} color={colors.teal} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>{'♫'}</Text>
            <Text style={styles.emptyText}>Your library is empty. Tap Add to create one.</Text>
          </View>
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
    borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14,
  },
  addText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  list: { paddingHorizontal: space.lg, paddingBottom: 110 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.hairline, ...shadow.card,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', marginRight: space.sm,
  },
  avatarText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  name: { color: colors.cream, fontSize: 15, fontWeight: '700' },
  genre: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginLeft: 2 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: space.xl },
  emptyGlyph: { color: colors.mutedSoft, fontSize: 40, marginBottom: space.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
