import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { useApp } from '../context/AppContext';
import { colors, space, radius } from '../theme/colors';

export default function ArtistFormScreen({ route, navigation }) {
  const { artists, addArtist, updateArtist } = useApp();
  const editing = artists.find((a) => a.id === route.params?.id);

  const [name, setName] = useState(editing?.name || '');
  const [tagline, setTagline] = useState(editing?.tagline || '');
  const [era, setEra] = useState(editing?.era || '');
  const [genre, setGenre] = useState(editing?.genre || '');
  const [bio, setBio] = useState(editing?.bio || '');
  const [songs, setSongs] = useState((editing?.songs || []).join(', '));
  const [err, setErr] = useState('');

  const save = () => {
    if (!name.trim()) {
      setErr('Name is required.');
      return;
    }
    const data = {
      name,
      tagline,
      era,
      genre,
      bio,
      songs: songs.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editing) updateArtist(editing.id, data);
    else addArtist(data);
    navigation.goBack();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.bar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={colors.cream} />
          </Pressable>
          <Text style={styles.barTitle}>{editing ? 'Edit artist' : 'New artist'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Name *" value={name} onChangeText={(t) => { setName(t); setErr(''); }} placeholder="e.g. Regine Velasquez" />
            {!!err && <Text style={styles.err}>{err}</Text>}
            <Field label="Tagline" value={tagline} onChangeText={setTagline} placeholder="e.g. Asia's Songbird" />
            <Field label="Active since" value={era} onChangeText={setEra} placeholder="e.g. Since 1986" />
            <Field label="Genre" value={genre} onChangeText={setGenre} placeholder="e.g. Pop, R&B, Ballad" />
            <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Short description" multiline />
            <Field label="Notable songs (comma separated)" value={songs} onChangeText={setSongs} placeholder="Song 1, Song 2, Song 3" multiline />

            <Pressable onPress={save} style={styles.saveBtn}>
              <Text style={styles.saveText}>{editing ? 'Save changes' : 'Add to library'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Field({ label, multiline, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor={colors.mutedSoft}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, paddingVertical: space.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.inkSoft,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  barTitle: { color: colors.cream, fontSize: 17, fontWeight: '800' },
  form: { padding: space.lg, paddingBottom: 40 },
  fieldWrap: { marginBottom: space.md },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.inkSoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: space.md, paddingVertical: 12, color: colors.cream, fontSize: 15,
  },
  inputMulti: { minHeight: 84, textAlignVertical: 'top' },
  err: { color: colors.danger, fontSize: 13, marginTop: -space.sm, marginBottom: space.sm },
  saveBtn: {
    backgroundColor: colors.amber, borderRadius: radius.pill, paddingVertical: 15,
    alignItems: 'center', marginTop: space.md,
  },
  saveText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
