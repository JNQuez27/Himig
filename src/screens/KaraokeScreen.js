import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import GradientBackground from '../components/GradientBackground';
import { useRoom } from '../context/RoomContext';
import { audioUri, readLyrics, useLibrary } from '../context/LibraryContext';
import { parseLrc, activeLine } from '../data/lrc';
import { colors, space, radius, shadow } from '../theme/colors';

const fmt = (ms) => {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const dim = ({ pressed }) => pressed && { opacity: 0.6 };
const COUNT_IN = 4000; // show a count-in this long before a line that follows a gap
const GAP = 8000; // a pause in the singing at least this long counts as a gap

// Both tracks play together and one is muted, so switching vocals on/off is
// instant. The instrumental is the clock; the original is re-synced on switch.
export default function KaraokeScreen({ navigation, route }) {
  // roomQid is set when this song is playing for a room: play, pause and the
  // end of the song then go through the room so everyone stays in step.
  const { song, roomQid } = route.params;
  const { room, send } = useRoom();
  const { markSung } = useLibrary();
  useKeepAwake(); // the screen must not sleep in the middle of a song

  const inst = useRef(null);
  const orig = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vocals, setVocals] = useState(false);
  const [lines, setLines] = useState([]);
  const [big, setBig] = useState(false); // larger lyrics for reading from a distance

  useEffect(() => {
    let gone = false;
    markSung(song.id);

    (async () => {
      try {
        const a = await Audio.Sound.createAsync(
          { uri: audioUri(song.instrumental) },
          { shouldPlay: false, progressUpdateIntervalMillis: 200 },
          (st) => {
            if (!st.isLoaded) return;
            setIsPlaying(st.isPlaying);
            setPosition(st.positionMillis || 0);
            setDuration(st.durationMillis || 0);
            if (st.didJustFinish) {
              inst.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
              orig.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
              if (roomQid) send({ type: 'next', qid: roomQid });
            }
          }
        );
        const b = await Audio.Sound.createAsync(
          { uri: audioUri(song.original) },
          { shouldPlay: false, volume: 0 }
        );
        if (gone) {
          a.sound.unloadAsync();
          b.sound.unloadAsync();
          return;
        }
        inst.current = a.sound;
        orig.current = b.sound;
        setReady(true);
        await Promise.all([a.sound.playAsync(), b.sound.playAsync()]);
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    if (song.lyrics) {
      readLyrics(song.lyrics)
        .then((t) => !gone && setLines(parseLrc(t)))
        .catch(() => {});
    }

    return () => {
      gone = true;
      inst.current?.unloadAsync().catch(() => {});
      orig.current?.unloadAsync().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const both = (fn) => Promise.all([inst.current, orig.current].filter(Boolean).map(fn));

  const togglePlay = () =>
    roomQid
      ? send({ type: isPlaying ? 'pause' : 'play' })
      : both((s) => (isPlaying ? s.pauseAsync() : s.playAsync()));

  // Anyone in the room can pause or resume; follow what the room says.
  const inRoom = roomQid && room?.current?.qid === roomQid;
  const roomPlaying = inRoom ? room.playing : null;
  useEffect(() => {
    if (!ready || roomPlaying === null) return;
    both((s) => (roomPlaying ? s.playAsync() : s.pauseAsync()));
  }, [ready, roomPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing the player stops the music on this phone, so tell the room.
  const close = () => {
    if (roomQid) send({ type: 'pause' });
    navigation.goBack();
  };
  const seekTo = (ms) => {
    const to = Math.max(0, Math.min(duration, ms));
    setPosition(to); // move the lyrics at once; the audio catches up
    both((s) => s.setPositionAsync(to));
  };
  const toggleVocals = async (on) => {
    if (on === vocals) return;
    setVocals(on);
    if (on) await orig.current?.setPositionAsync(position);
    await inst.current?.setVolumeAsync(on ? 0 : 1);
    await orig.current?.setVolumeAsync(on ? 1 : 0);
  };

  const idx = useMemo(() => activeLine(lines, position), [lines, position]);

  // Count-in: after an intro or a long break, show when to come in.
  const next = lines[idx + 1];
  const wait = next ? next.time - position : 0;
  const afterGap = next && (idx < 0 || next.time - lines[idx].time > GAP);
  const countIn = afterGap && wait > 0 && wait <= COUNT_IN ? Math.ceil(wait / 1000) : 0;
  const waiting = afterGap && wait > COUNT_IN;

  // Keep the line being sung a little above the middle of the lyrics area.
  const scroll = useRef(null);
  const ys = useRef([]);
  const viewH = useRef(0);
  const handsOffUntil = useRef(0); // the user is reading ahead: do not yank the list back
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const follow = () => {
    const i = idxRef.current;
    if (i < 0 || Date.now() < handsOffUntil.current) return;
    const y = ys.current[i];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - viewH.current * 0.3), animated: true });
  };
  useEffect(follow, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const upNext = inRoom ? room.queue[0] : null;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" />

        <View style={styles.bar}>
          <Pressable
            onPress={close}
            style={(s) => [styles.iconBtn, dim(s)]}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={22} color={colors.cream} />
          </Pressable>
          <View style={styles.barText}>
            <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>
              {inRoom ? `${room.current.singer} is singing  ·  Room ${room.code}` : song.artist}
            </Text>
          </View>
          <Pressable
            onPress={() => setBig((b) => !b)}
            style={(s) => [styles.iconBtn, big && styles.iconBtnOn, dim(s)]}
            accessibilityRole="button"
            accessibilityState={{ selected: big }}
            accessibilityLabel="Larger lyrics"
          >
            <Text style={[styles.aa, big && { color: colors.ink }]}>Aa</Text>
          </Pressable>
        </View>

        {/* Lyrics */}
        <View style={styles.stage} onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }}>
          {failed ? (
            <Center icon="cloud-offline-outline" text="Could not load this song. Check the server connection." />
          ) : !ready ? (
            <ActivityIndicator color={colors.amber} size="large" style={{ flex: 1 }} />
          ) : lines.length === 0 ? (
            <Center icon="musical-notes-outline" text="No lyrics for this song. Sing it from the heart." />
          ) : (
            <>
              <View style={styles.cueRow} accessibilityLiveRegion="polite">
                {(countIn > 0 || waiting) && (
                <View style={styles.cue}>
                  {waiting ? (
                    <Text style={styles.cueText}>{`Music  ·  sing in ${fmt(wait)}`}</Text>
                  ) : (
                    <>
                      {[3, 2, 1].map((n) => (
                        <View key={n} style={[styles.dot, countIn <= n && styles.dotOn]} />
                      ))}
                      <Text style={styles.cueText}>Get ready</Text>
                    </>
                  )}
                </View>
                )}
              </View>
              <ScrollView
                ref={scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lines}
                onScrollBeginDrag={() => { handsOffUntil.current = Date.now() + 4000; }}
              >
                {lines.map((l, i) => {
                  const d = i - idx; // distance from the line being sung
                  return (
                    <Pressable
                      key={`${l.time}-${i}`}
                      onLayout={(e) => {
                        ys.current[i] = e.nativeEvent.layout.y;
                        // Text size changed: the sung line moved, so find it again.
                        if (i === idxRef.current) follow();
                      }}
                      onPress={() => { handsOffUntil.current = 0; seekTo(l.time); }}
                      style={styles.lineTap}
                      accessibilityRole="button"
                      accessibilityLabel={`${l.text || 'Instrumental'}. Jump to ${fmt(l.time)}`}
                    >
                      <Text
                        style={[
                          styles.line,
                          big && styles.lineBig,
                          d === 0 && (big ? styles.nowBig : styles.now),
                          d === 1 && styles.soon,
                          d < 0 && styles.sung,
                        ]}
                      >
                        {l.text || '♪'}
                      </Text>
                    </Pressable>
                  );
                })}
                {song.lyrics_auto && (
                  <Text style={styles.auto}>Auto-generated lyrics, may contain mistakes</Text>
                )}
              </ScrollView>

            </>
          )}
        </View>

        {upNext && (
          <View style={styles.next}>
            <Ionicons name="list" size={18} color={colors.teal} />
            <Text style={styles.nextText} numberOfLines={1}>
              {`Up next: ${upNext.song.title}  ·  ${upNext.singer}`}
            </Text>
            <Pressable
              onPress={() => send({ type: 'next', qid: roomQid })}
              style={(s) => [styles.nextBtn, dim(s)]}
              accessibilityRole="button"
              accessibilityLabel="Skip to the next song"
            >
              <Ionicons name="play-skip-forward" size={20} color={colors.cream} />
            </Pressable>
          </View>
        )}

        {/* Controls */}
        <View style={styles.panel}>
          <View style={styles.mode} accessibilityRole="radiogroup" accessibilityLabel="Vocals">
            {[
              { on: false, label: 'Karaoke', icon: 'mic' },
              { on: true, label: 'With vocals', icon: 'person' },
            ].map((m) => (
              <Pressable
                key={m.label}
                onPress={() => toggleVocals(m.on)}
                disabled={!ready}
                style={[styles.modeHalf, vocals === m.on && styles.modeOn]}
                accessibilityRole="radio"
                accessibilityState={{ checked: vocals === m.on }}
              >
                <Ionicons name={m.icon} size={16} color={vocals === m.on ? colors.ink : colors.muted} />
                <Text style={[styles.modeText, vocals === m.on && styles.modeTextOn]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          <SeekBar position={position} duration={duration} onSeek={seekTo} disabled={!ready} />

          <View style={styles.controls}>
            <Pressable
              onPress={() => seekTo(0)}
              disabled={!ready}
              style={(s) => [styles.side, dim(s)]}
              accessibilityRole="button"
              accessibilityLabel="Start the song again"
            >
              <Ionicons name="refresh" size={24} color={colors.cream} />
            </Pressable>
            <Pressable
              onPress={() => seekTo(position - 10000)}
              disabled={!ready}
              style={(s) => [styles.side, dim(s)]}
              accessibilityRole="button"
              accessibilityLabel="Back 10 seconds"
            >
              <Ionicons name="play-back" size={26} color={colors.cream} />
            </Pressable>
            <Pressable
              onPress={togglePlay}
              disabled={!ready}
              style={(s) => [styles.bigBtn, !ready && { opacity: 0.5 }, s.pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={() => seekTo(position + 10000)}
              disabled={!ready}
              style={(s) => [styles.side, dim(s)]}
              accessibilityRole="button"
              accessibilityLabel="Forward 10 seconds"
            >
              <Ionicons name="play-forward" size={26} color={colors.cream} />
            </Pressable>
            <Pressable
              onPress={() => idx >= 0 && seekTo(lines[idx].time)}
              disabled={!ready || idx < 0}
              style={(s) => [styles.side, idx < 0 && { opacity: 0.35 }, dim(s)]}
              accessibilityRole="button"
              accessibilityLabel="Repeat this line"
            >
              <Ionicons name="return-up-back" size={24} color={colors.cream} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Center({ icon, text }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={colors.mutedSoft} />
      <Text style={styles.note}>{text}</Text>
    </View>
  );
}

// Tap or drag anywhere on the bar to move through the song.
// ponytail: plain touch responder, no gesture library (that would need an APK rebuild).
function SeekBar({ position, duration, onSeek, disabled }) {
  const [w, setW] = useState(0);
  const [drag, setDrag] = useState(null); // 0..1 while a finger is down
  const at = (e) => (w ? Math.max(0, Math.min(1, e.nativeEvent.locationX / w)) : 0);
  const shown = drag ?? (duration > 0 ? position / duration : 0);

  return (
    <View>
      <View
        style={styles.seek}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setDrag(at(e))}
        onResponderMove={(e) => setDrag(at(e))}
        onResponderRelease={(e) => {
          onSeek(at(e) * duration);
          setDrag(null);
        }}
        onResponderTerminate={() => setDrag(null)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Song position"
        accessibilityValue={{ text: `${fmt(position)} of ${fmt(duration)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onSeek(position + (e.nativeEvent.actionName === 'increment' ? 10000 : -10000))
        }
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${shown * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, drag != null && styles.thumbOn, { left: shown * w - (drag != null ? 10 : 7) }]}
        />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{fmt(drag != null ? drag * duration : position)}</Text>
        <Text style={styles.time}>{fmt(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, paddingHorizontal: space.lg },
  barText: { flex: 1, alignItems: 'center', paddingHorizontal: space.sm },
  title: { color: colors.cream, fontSize: 17, fontWeight: '800' },
  artist: { color: colors.teal, fontSize: 13, fontWeight: '600', marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  aa: { color: colors.cream, fontSize: 15, fontWeight: '800' },

  stage: { flex: 1 },
  lines: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 220 },
  lineTap: { paddingVertical: 9, minHeight: 44, justifyContent: 'center' },
  line: { color: colors.mutedSoft, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  lineBig: { fontSize: 28, lineHeight: 37 },
  soon: { color: colors.cream },
  sung: { color: 'rgba(245, 238, 210, 0.28)' },
  now: { color: colors.amber, fontSize: 30, lineHeight: 38, fontWeight: '900' },
  nowBig: { color: colors.amber, fontSize: 38, lineHeight: 46, fontWeight: '900' },
  auto: { color: colors.mutedSoft, fontSize: 12, marginTop: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl },
  note: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cue: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, backgroundColor: colors.inkSofter, borderRadius: radius.pill, paddingHorizontal: 16,
    minHeight: 36, borderWidth: 1, borderColor: colors.hairline,
  },
  cueRow: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cueText: { color: colors.cream, fontSize: 13, fontWeight: '800' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink, borderWidth: 1.5, borderColor: colors.amber },
  dotOn: { backgroundColor: colors.amber },

  next: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, marginHorizontal: space.lg,
    marginBottom: space.xs, paddingLeft: space.md, backgroundColor: colors.inkSoft,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline,
  },
  nextText: { flex: 1, color: colors.cream, fontSize: 13, fontWeight: '700' },
  nextBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  panel: {
    backgroundColor: colors.inkSoft, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.hairline,
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm,
  },
  mode: {
    flexDirection: 'row', alignSelf: 'center', backgroundColor: colors.ink, borderRadius: radius.pill,
    padding: 4, overflow: 'hidden',
  },
  modeHalf: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, justifyContent: 'center',
    paddingHorizontal: space.lg, borderRadius: 22, backgroundColor: 'transparent', overflow: 'hidden',
  },
  modeOn: { backgroundColor: colors.amber },
  modeText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  modeTextOn: { color: colors.ink },

  seek: { height: 44, justifyContent: 'center', marginTop: space.xs },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.inkSofter, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.online },
  thumb: {
    position: 'absolute', top: 15, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.cream,
  },
  thumbOn: { top: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.amber },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  time: { color: colors.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs,
  },
  side: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  bigBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.online,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
});
