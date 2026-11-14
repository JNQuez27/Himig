import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useTab } from '../context/TabContext';
import { useRoom } from '../context/RoomContext';
import { colors, space, radius, shadow } from '../theme/colors';

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const pressed = ({ pressed: p }) => p && { opacity: 0.8 };

// Home gets you singing in one tap: the big block resumes the last song (or
// starts the first step when the library is empty); everything else is a shortcut.
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { songs, recent, pending } = useLibrary();
  const { setTab } = useTab();
  const { room } = useRoom();

  const sing = (song) => navigation.navigate('Karaoke', { song });
  const next = recent[0] || songs[0];
  const rest = songs.filter((s) => !recent.some((r) => r.id === s.id)).slice(0, 5);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>{greeting().toUpperCase()}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {user?.name ? user.name.split(' ')[0] : 'Ready to sing?'}
      </Text>

      {/* Primary action */}
      <Pressable
        onPress={() => (next ? sing(next) : navigation.navigate('AddSong'))}
        style={(s) => [styles.hero, pressed(s)]}
        accessibilityRole="button"
        accessibilityLabel={next ? `Sing ${next.title} by ${next.artist}` : 'Add your first song'}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>
            {next ? (recent[0] ? 'CONTINUE SINGING' : 'START SINGING') : 'GET STARTED'}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {next ? next.title : 'Add your first song'}
          </Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            {next
              ? next.artist
              : 'Pick a song on your phone. We remove the vocals and add the lyrics.'}
          </Text>
        </View>
        <View style={styles.heroBtn}>
          <Ionicons name={next ? 'mic' : 'add'} size={30} color={colors.amber} />
        </View>
      </Pressable>

      {/* Shortcuts */}
      <View style={styles.row}>
        <Pressable
          onPress={() => navigation.navigate('AddSong')}
          style={(s) => [styles.block, { backgroundColor: colors.teal }, pressed(s)]}
          accessibilityRole="button"
        >
          <Ionicons name="musical-notes" size={24} color={colors.ink} />
          <Text style={[styles.blockTitle, { color: colors.ink }]}>Add a song</Text>
          <Text style={[styles.blockSub, { color: colors.ink }]}>From your phone</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('catalog')}
          style={(s) => [styles.block, styles.blockDark, pressed(s)]}
          accessibilityRole="button"
        >
          <Ionicons name="search" size={24} color={colors.amber} />
          <Text style={styles.blockTitle}>Catalog</Text>
          <Text style={styles.blockSub}>Ready-made karaoke</Text>
        </Pressable>
      </View>

      {/* Multiplayer */}
      <Pressable
        onPress={() => navigation.navigate('Room')}
        style={(s) => [styles.together, room && styles.togetherOn, pressed(s)]}
        accessibilityRole="button"
      >
        <View style={styles.togetherIcon}>
          <Ionicons name="people" size={22} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.togetherTitle}>
            {room ? `Room ${room.code}` : 'Sing together'}
          </Text>
          <Text style={styles.blockSub} numberOfLines={1}>
            {room
              ? `${room.members.length} here  ·  ${room.current ? room.current.song.title : 'nothing playing'}`
              : 'Start a room or join with a code'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.muted} />
      </Pressable>

      {pending.some((p) => !p.failed) && (
        <Pressable
          onPress={() => setTab('music')}
          style={(s) => [styles.notice, pressed(s)]}
          accessibilityRole="button"
        >
          <Ionicons name="hourglass-outline" size={20} color={colors.amber} />
          <Text style={styles.noticeText} numberOfLines={1}>
            {`Preparing ${pending.filter((p) => !p.failed).length} song(s). They appear in your Library when ready.`}
          </Text>
        </Pressable>
      )}

      {recent.length > 1 && (
        <>
          <Text style={styles.section} accessibilityRole="header">Recently sung</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRow}
            style={styles.bleed}
          >
            {recent.slice(1).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => sing(s)}
                style={(st) => [styles.recent, pressed(st)]}
                accessibilityRole="button"
                accessibilityLabel={`Sing ${s.title} by ${s.artist}`}
              >
                <View style={styles.recentArt}>
                  <Ionicons name="mic" size={26} color={colors.ink} />
                </View>
                <Text style={styles.recentTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.recentSub} numberOfLines={1}>{s.artist}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {rest.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { flex: 1 }]} accessibilityRole="header">Your songs</Text>
            <Pressable onPress={() => setTab('music')} hitSlop={12} accessibilityRole="button">
              <Text style={styles.link}>See all</Text>
            </Pressable>
          </View>
          {rest.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => sing(s)}
              style={(st) => [styles.song, pressed(st)]}
              accessibilityRole="button"
              accessibilityLabel={`Sing ${s.title} by ${s.artist}`}
            >
              <View style={styles.songArt}>
                <Ionicons name="mic" size={20} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.songSub} numberOfLines={1}>{`${s.artist}  ·  ${fmt(s.duration)}`}</Text>
              </View>
              <Ionicons name="play-circle" size={32} color={colors.online} />
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 130 },
  eyebrow: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { color: colors.cream, fontSize: 32, fontWeight: '900', marginTop: 2, marginBottom: space.md },

  hero: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amber,
    borderRadius: radius.xl, padding: space.lg, minHeight: 148, ...shadow.card,
  },
  heroLabel: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1, opacity: 0.75 },
  heroTitle: { color: colors.ink, fontSize: 26, lineHeight: 30, fontWeight: '900', marginTop: space.xs },
  heroSub: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 4, opacity: 0.8 },
  heroBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center', marginLeft: space.md,
  },

  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  block: { flex: 1, borderRadius: radius.lg, padding: space.md, minHeight: 112, justifyContent: 'flex-end' },
  blockDark: { backgroundColor: colors.inkSoft, borderWidth: 1, borderColor: colors.hairline },
  blockTitle: { color: colors.cream, fontSize: 17, fontWeight: '900', marginTop: space.sm },
  blockSub: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },

  together: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 72, marginTop: space.sm,
    backgroundColor: colors.inkSoft, borderRadius: radius.lg, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.hairline,
  },
  togetherOn: { borderColor: colors.teal },
  togetherIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  togetherTitle: { color: colors.cream, fontSize: 17, fontWeight: '900' },

  notice: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, marginTop: space.sm,
    backgroundColor: colors.inkSoft, borderRadius: radius.md, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.hairline,
  },
  noticeText: { flex: 1, color: colors.cream, fontSize: 13, fontWeight: '600' },

  section: { color: colors.cream, fontSize: 20, fontWeight: '900', marginTop: space.xl, marginBottom: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline' },
  link: { color: colors.amber, fontSize: 14, fontWeight: '800' },

  bleed: { marginHorizontal: -space.lg },
  recentRow: { paddingHorizontal: space.lg, gap: space.sm },
  recent: { width: 132 },
  recentArt: {
    width: 132, height: 132, borderRadius: radius.lg, backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.xs,
  },
  recentTitle: { color: colors.cream, fontSize: 14, fontWeight: '800' },
  recentSub: { color: colors.muted, fontSize: 12, marginTop: 2 },

  song: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm, minHeight: 64,
    borderWidth: 1, borderColor: colors.hairline,
  },
  songArt: {
    width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', marginRight: space.sm,
  },
  songTitle: { color: colors.cream, fontSize: 15, fontWeight: '800' },
  songSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
