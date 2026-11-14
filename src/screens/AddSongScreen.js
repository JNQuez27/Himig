import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import GradientBackground from '../components/GradientBackground';
import { uploadSong } from '../data/api';
import { useLibrary } from '../context/LibraryContext';
import { colors, space, radius } from '../theme/colors';

// Pick an audio file from the phone and send it to the server, which removes
// the vocals and looks up lyrics. Needs a connection to the server.
export default function AddSongScreen({ navigation }) {
  const { track } = useLibrary();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (res.canceled) return;
    const f = res.assets[0];
    setFile(f);
    setErr('');
    // Most files are named "Artist - Title.mp3"; use that as a starting point.
    const base = f.name.replace(/\.[^.]+$/, '');
    const [a, t] = base.includes(' - ') ? base.split(' - ') : ['', base];
    if (!title) setTitle(t.trim());
    if (!artist && a) setArtist(a.trim());
  };

  const submit = async () => {
    if (!file) return setErr('Choose an audio file first.');
    if (!title.trim() || !artist.trim()) return setErr('Title and artist are required. They are used to find the lyrics.');
    setSending(true);
    try {
      const { id } = await uploadSong({ title: title.trim(), artist: artist.trim(), file });
      track({ id, title: title.trim(), artist: artist.trim() });
      navigation.goBack();
    } catch (e) {
      setErr(e.message === 'Network request failed' ? 'Cannot reach the karaoke server.' : e.message);
      setSending(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.bar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={colors.cream} />
          </Pressable>
          <Text style={styles.barTitle}>Add your own song</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pick} style={styles.pick} accessibilityRole="button">
            <Ionicons name={file ? 'musical-note' : 'folder-open-outline'} size={22} color={colors.amber} />
            <Text style={styles.pickText} numberOfLines={1}>
              {file ? file.name : 'Choose audio file'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Song title"
            placeholderTextColor={colors.mutedSoft}
            maxLength={200}
          />
          <Text style={styles.label}>Artist</Text>
          <TextInput
            style={styles.input}
            value={artist}
            onChangeText={setArtist}
            placeholder="Artist name"
            placeholderTextColor={colors.mutedSoft}
            maxLength={200}
          />

          {!!err && <Text style={styles.err} accessibilityRole="alert">{err}</Text>}

          <Pressable onPress={submit} disabled={sending} style={[styles.submit, sending && { opacity: 0.6 }]}>
            {sending ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.submitText}>Prepare karaoke version</Text>
            )}
          </Pressable>
          <Text style={styles.hint}>
            Removing the vocals takes about 4 minutes. The song then downloads into your Library
            by itself, with lyrics, ready to sing offline.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: space.lg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm },
  barTitle: { color: colors.cream, fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingTop: space.md, paddingBottom: space.xl },
  pick: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56,
    backgroundColor: colors.inkSoft, borderRadius: radius.md, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.hairline, borderStyle: 'dashed',
  },
  pickText: { flex: 1, color: colors.cream, fontSize: 15, fontWeight: '600' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: space.md, marginBottom: space.xs },
  input: {
    minHeight: 50, backgroundColor: colors.inkSofter, borderRadius: radius.md,
    paddingHorizontal: space.md, color: colors.cream, fontSize: 16,
  },
  err: { color: colors.danger, fontSize: 13, marginTop: space.md },
  submit: {
    minHeight: 54, borderRadius: radius.pill, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', marginTop: space.lg,
  },
  submitText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  hint: { color: colors.mutedSoft, fontSize: 12, textAlign: 'center', marginTop: space.md, lineHeight: 18 },
});
