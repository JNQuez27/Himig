import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { usePlayer } from '../context/PlayerContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function DetailScreen({ route, navigation }) {
  const { artists, toggleFavorite } = useApp();
  const { play } = usePlayer();
  const singer = artists.find((a) => a.id === route.params?.id);
  const tracks = (singer?.songs || []).map((s) => ({
    id: `${singer.id}-${s}`,
    title: s,
    artist: singer.name,
    art: null,
    preview: null,
  }));
  const playSong = (idx) => {
    play(tracks, idx);
    navigation.navigate('NowPlaying');
  };

  // if the artist was deleted elsewhere, leave the (now empty) detail screen
  useEffect(() => {
    if (!singer) navigation.goBack();
  }, [singer, navigation]);
  if (!singer) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />

      <View style={styles.hero}>
        <View style={styles.heroBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.amber} />
          </Pressable>
          <Text style={styles.heroBarTitle} numberOfLines={1}>Artist</Text>
          <View style={styles.heroBarActions}>
            <Pressable onPress={() => navigation.navigate('ArtistForm', { id: singer.id })} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={20} color={colors.teal} />
            </Pressable>
            <Pressable onPress={() => toggleFavorite(singer.id)} hitSlop={10} style={styles.iconBtn}>
              <Ionicons
                name={singer.favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={singer.favorite ? colors.danger : colors.amber}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{singer.initials}</Text>
          </View>
        </View>
        <Text style={styles.name}>{singer.name}</Text>
        <Text style={styles.tagline}>{singer.tagline}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}><Text style={styles.metaText}>{singer.genre}</Text></View>
          <View style={styles.metaPill}><Text style={styles.metaText}>{singer.era}</Text></View>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {!!singer.bio && (
          <>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bio}>{singer.bio}</Text>
          </>
        )}

        <View style={styles.songsHead}>
          <Text style={styles.sectionLabel}>Notable songs</Text>
          <Text style={styles.songsCount}>{singer.songs.length} tracks</Text>
        </View>

        {singer.songs.length === 0 && (
          <Text style={styles.bio}>No songs added yet.</Text>
        )}
        {singer.songs.map((song, idx) => (
          <Pressable key={song + idx} style={styles.songRow} onPress={() => playSong(idx)}>
            <View style={styles.songIndex}><Text style={styles.songIndexText}>{idx + 1}</Text></View>
            <View style={styles.songInfo}>
              <Text style={styles.songText} numberOfLines={1}>{song}</Text>
              <Text style={styles.songSub} numberOfLines={1}>{singer.name}</Text>
            </View>
            <View style={styles.songPlay}><Text style={styles.songPlayGlyph}>{'▶'}</Text></View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  hero: { backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingBottom: space.xl, alignItems: 'center' },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: space.md },
  heroBarTitle: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  heroBarActions: { flexDirection: 'row', gap: space.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    width: 116, height: 116, borderRadius: radius.pill, borderWidth: 3, borderColor: colors.amber,
    padding: 5, alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  avatar: { flex: 1, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontSize: 34, fontWeight: '900' },
  name: { color: colors.cream, fontSize: 26, fontWeight: '900', marginTop: space.md, textAlign: 'center' },
  tagline: { color: colors.amber, fontSize: 13, fontWeight: '700', marginTop: 4 },
  metaRow: { flexDirection: 'row', marginTop: space.md, gap: space.sm },
  metaPill: { backgroundColor: colors.inkSofter, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 6 },
  metaText: { color: colors.cream, fontSize: 12, fontWeight: '600' },
  body: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  bodyContent: { padding: space.xl, paddingBottom: 120 },
  sectionLabel: { color: colors.ink, fontSize: 17, fontWeight: '900', marginBottom: space.sm },
  bio: { color: 'rgba(19,34,40,0.75)', fontSize: 14, lineHeight: 22, marginBottom: space.lg },
  songsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  songsCount: { color: 'rgba(19,34,40,0.5)', fontSize: 12, fontWeight: '600' },
  songRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.creamSoft, borderRadius: radius.md, padding: space.sm, marginBottom: space.sm },
  songIndex: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
  songIndexText: { color: colors.cream, fontWeight: '800', fontSize: 13 },
  songInfo: { flex: 1 },
  songText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  songSub: { color: 'rgba(19,34,40,0.5)', fontSize: 12, marginTop: 1 },
  songPlay: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', marginLeft: space.sm },
  songPlayGlyph: { color: colors.ink, fontSize: 12, marginLeft: 1 },
});
