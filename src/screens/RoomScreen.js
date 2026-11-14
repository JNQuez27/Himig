import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useLibrary } from '../context/LibraryContext';
import { fetchKaraokeSongs, fetchServerBase } from '../data/api';
import { colors, space, radius, shadow } from '../theme/colors';

const dim = ({ pressed }) => pressed && { opacity: 0.75 };

export default function RoomScreen({ navigation }) {
  const { room } = useRoom();
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {room ? <Lobby navigation={navigation} /> : <Entry navigation={navigation} />}
      </SafeAreaView>
    </GradientBackground>
  );
}

function Bar({ navigation, title, right }) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="chevron-down" size={22} color={colors.cream} />
      </Pressable>
      <Text style={styles.barTitle}>{title}</Text>
      <View style={styles.barRight}>{right}</View>
    </View>
  );
}

// Not in a room yet: start one, or join with a code. No account needed, just a name.
function Entry({ navigation }) {
  const { user } = useAuth();
  const { create, join, error, busy } = useRoom();
  const [name, setName] = useState(user?.name || '');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const need = (fn) => () => {
    if (!name.trim()) return setErr('Enter a name so friends know who is singing.');
    setErr('');
    fn();
  };

  return (
    <>
      <Bar navigation={navigation} title="Sing together" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Shown to everyone in the room"
          placeholderTextColor={colors.mutedSoft}
          maxLength={30}
        />

        <Pressable
          onPress={need(() => create(name))}
          disabled={busy}
          style={(s) => [styles.primary, dim(s)]}
          accessibilityRole="button"
        >
          {busy ? <ActivityIndicator color={colors.ink} /> : (
            <>
              <Ionicons name="add-circle" size={22} color={colors.ink} />
              <Text style={styles.primaryText}>Start a room</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.hint}>You get a code to share. Your phone plays the music, or a TV if you open the big screen page.</Text>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or join one</Text>
          <View style={styles.orLine} />
        </View>

        <Text style={styles.label}>Room code</Text>
        <View style={styles.joinRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^a-zA-Z]/g, '').toUpperCase())}
            placeholder="ABCD"
            placeholderTextColor={colors.mutedSoft}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={4}
          />
          <Pressable
            onPress={need(() => (code.length === 4 ? join(code, name) : setErr('The code has 4 letters.')))}
            disabled={busy}
            style={(s) => [styles.joinBtn, dim(s)]}
            accessibilityRole="button"
          >
            <Text style={styles.joinText}>Join</Text>
          </Pressable>
        </View>

        {!!(err || error) && <Text style={styles.err} accessibilityRole="alert">{err || error}</Text>}
      </ScrollView>
    </>
  );
}

function Lobby({ navigation }) {
  const { room, me, isPlayer, hostName, send, leave } = useRoom();
  const library = useLibrary();
  const [picking, setPicking] = useState(false);
  const [songs, setSongs] = useState(null);
  const [base, setBase] = useState('');
  const now = room.current;

  useEffect(() => {
    fetchServerBase().then(setBase).catch(() => {});
  }, []);

  useEffect(() => {
    if (!picking) return;
    fetchKaraokeSongs()
      .then((all) => setSongs(all.filter((s) => s.status === 'ready')))
      .catch(() => setSongs([]));
  }, [picking]);

  const confirmLeave = () =>
    Alert.alert('Leave room', `Leave room ${room.code}?`, [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => { leave(); navigation.goBack(); } },
    ]);

  const openPlayer = () => {
    send({ type: 'play' });
    navigation.navigate('Karaoke', {
      song: library.local(now.song.id) || now.song,
      roomQid: now.qid,
    });
  };

  return (
    <>
      <Bar
        navigation={navigation}
        title="Room"
        right={
          <Pressable onPress={confirmLeave} hitSlop={10} style={styles.leave} accessibilityRole="button">
            <Text style={styles.leaveText}>Leave</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.lobby} showsVerticalScrollIndicator={false}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <Text style={styles.code} accessibilityLabel={`Room code ${room.code.split('').join(' ')}`}>
            {room.code}
          </Text>
          <Text style={styles.codeHint}>Friends open Himig, tap Sing together, and enter this code.</Text>
          {!!base && !room.display && (
            <Text style={styles.codeHint}>{`Big screen: open ${base}/tv on a TV or laptop.`}</Text>
          )}
        </View>

        <View style={styles.members}>
          {room.members.map((m) => (
            <View key={m.id} style={[styles.chip, m.id === me && styles.chipMe]}>
              {m.id === room.host && !room.display && (
                <Ionicons name="volume-high" size={14} color={colors.amber} />
              )}
              <Text style={styles.chipText} numberOfLines={1}>{m.id === me ? `${m.name} (you)` : m.name}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.hostNote}>
          {room.display
            ? 'Music and lyrics are on the big screen.'
            : isPlayer
              ? 'Your phone plays the music.'
              : `Music plays on ${hostName || 'the host'}'s phone.`}
        </Text>

        <Text style={styles.section} accessibilityRole="header">Now singing</Text>
        {now ? (
          <View style={styles.now}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nowTitle} numberOfLines={1}>{now.song.title}</Text>
              <Text style={styles.nowSub} numberOfLines={1}>{`${now.singer}  ·  ${now.song.artist}`}</Text>
            </View>
            <Pressable
              // On the host's phone, resuming also reopens the player that makes the sound.
              onPress={() => (isPlayer && !room.playing ? openPlayer() : send({ type: room.playing ? 'pause' : 'play' }))}
              style={styles.ctrl}
              accessibilityRole="button"
              accessibilityLabel={room.playing ? 'Pause' : 'Play'}
            >
              <Ionicons name={room.playing ? 'pause' : 'play'} size={24} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={() => send({ type: 'next', qid: now.qid })}
              style={styles.ctrl}
              accessibilityRole="button"
              accessibilityLabel="Skip to the next song"
            >
              <Ionicons name="play-skip-forward" size={22} color={colors.ink} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>Nothing playing. Add a song to start.</Text>
        )}
        {now && isPlayer && (
          <Pressable onPress={openPlayer} style={(s) => [styles.secondary, dim(s)]} accessibilityRole="button">
            <Ionicons name="mic" size={20} color={colors.cream} />
            <Text style={styles.secondaryText}>Open lyrics player</Text>
          </Pressable>
        )}

        <Text style={styles.section} accessibilityRole="header">
          {`Up next${room.queue.length ? ` (${room.queue.length})` : ''}`}
        </Text>
        {room.queue.length === 0 && <Text style={styles.empty}>The queue is empty.</Text>}
        {room.queue.map((q, i) => (
          <View key={q.qid} style={styles.row}>
            <Text style={styles.rowNum}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{q.song.title}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{`${q.singer}  ·  ${q.song.artist}`}</Text>
            </View>
            <Pressable
              onPress={() => send({ type: 'remove', qid: q.qid })}
              style={styles.rowBtn}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${q.song.title} from the queue`}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => setPicking((p) => !p)}
          style={(s) => [styles.primary, dim(s)]}
          accessibilityRole="button"
        >
          <Ionicons name={picking ? 'chevron-up' : 'add'} size={22} color={colors.ink} />
          <Text style={styles.primaryText}>{picking ? 'Done adding' : 'Add a song'}</Text>
        </Pressable>

        {picking && (songs === null ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: space.md }} />
        ) : songs.length === 0 ? (
          <Text style={styles.empty}>No songs on the server yet. Add one from your Library first.</Text>
        ) : (
          songs.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => send({ type: 'add', song_id: s.id })}
              style={(st) => [styles.row, dim(st)]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${s.title} to the queue`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{s.artist}</Text>
              </View>
              <Ionicons name="add-circle" size={28} color={colors.online} />
            </Pressable>
          ))
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: space.lg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  barTitle: { flex: 1, textAlign: 'center', color: colors.cream, fontSize: 16, fontWeight: '700' },
  barRight: { minWidth: 44, alignItems: 'flex-end' },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  leave: { minHeight: 44, justifyContent: 'center' },
  leaveText: { color: colors.danger, fontSize: 14, fontWeight: '800' },

  form: { paddingTop: space.md, paddingBottom: space.xl },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: space.md, marginBottom: space.xs },
  input: {
    minHeight: 52, backgroundColor: colors.inkSofter, borderRadius: radius.md,
    paddingHorizontal: space.md, color: colors.cream, fontSize: 16,
  },
  primary: {
    flexDirection: 'row', gap: space.xs, minHeight: 56, borderRadius: radius.pill,
    backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
    marginBottom: space.sm,
  },
  primaryText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  hint: { color: colors.mutedSoft, fontSize: 12, textAlign: 'center', marginTop: space.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl },
  orLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  orText: { color: colors.mutedSoft, fontSize: 12, fontWeight: '700' },
  joinRow: { flexDirection: 'row', gap: space.sm },
  codeInput: { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  joinBtn: {
    minHeight: 52, paddingHorizontal: space.xl, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.teal, alignItems: 'center', justifyContent: 'center',
  },
  joinText: { color: colors.cream, fontSize: 16, fontWeight: '800' },
  err: { color: colors.danger, fontSize: 13, marginTop: space.md, textAlign: 'center' },

  lobby: { paddingBottom: space.xl },
  codeCard: {
    backgroundColor: colors.amber, borderRadius: radius.xl, padding: space.lg,
    alignItems: 'center', marginTop: space.sm, ...shadow.card,
  },
  codeLabel: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 1, opacity: 0.75 },
  code: { color: colors.ink, fontSize: 56, lineHeight: 64, fontWeight: '900', letterSpacing: 10, marginLeft: 10 },
  codeHint: { color: colors.ink, fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.8 },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.inkSoft,
    borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 32,
    borderWidth: 1, borderColor: colors.hairline, maxWidth: '100%',
  },
  chipMe: { borderColor: colors.teal },
  chipText: { color: colors.cream, fontSize: 13, fontWeight: '700' },
  hostNote: { color: colors.muted, fontSize: 12, marginTop: space.sm },
  section: { color: colors.cream, fontSize: 18, fontWeight: '900', marginTop: space.lg, marginBottom: space.sm },
  empty: { color: colors.muted, fontSize: 14 },
  now: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.inkSoft,
    borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.teal,
  },
  nowTitle: { color: colors.cream, fontSize: 18, fontWeight: '900' },
  nowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  ctrl: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.online,
    alignItems: 'center', justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row', gap: space.xs, minHeight: 48, borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginTop: space.sm,
  },
  secondaryText: { color: colors.cream, fontSize: 15, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.inkSoft,
    borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 60, marginBottom: space.xs,
    borderWidth: 1, borderColor: colors.hairline,
  },
  rowNum: { color: colors.amber, fontSize: 16, fontWeight: '900', width: 20 },
  rowTitle: { color: colors.cream, fontSize: 15, fontWeight: '800' },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
