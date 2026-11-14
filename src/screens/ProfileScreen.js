import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLibrary, mb } from '../context/LibraryContext';
import { getServerUrl, setServerUrl } from '../data/api';
import { colors, space, radius, shadow } from '../theme/colors';

export default function ProfileScreen() {
  const { user, signOut, setGuestMode } = useAuth();
  const library = useLibrary();
  const [server, setServer] = useState(getServerUrl());
  const [saved, setSaved] = useState(true);

  const saveServer = async () => {
    setServer(await setServerUrl(server));
    setSaved(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.ink} />
        </View>
        <Text style={styles.name}>{user?.name || 'Guest'}</Text>
        <Text style={styles.handle}>{user?.email || 'No account, everything stays on this phone'}</Text>
      </View>

      <View style={styles.statRow}>
        <Stat value={library.songs.length} label="Songs" />
        <Stat value={library.recent.length} label="Sung" />
        <Stat value={library.pending.length} label="Preparing" />
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <Row icon="person-outline" label="Account" meta={user ? 'Signed in' : 'Guest'} />
        <Divider />
        <Row icon="cloud-done-outline" label="Offline storage" meta={mb(library.bytes)} />
        <Divider />
        <Row icon="information-circle-outline" label="Version" meta="1.0.0" />
      </View>

      <Text style={styles.section}>Karaoke server</Text>
      <View style={[styles.card, { paddingVertical: space.md }]}>
        <Text style={styles.serverHelp}>
          Where songs are prepared and rooms are hosted. For a party with no internet, run the
          server on a laptop and enter the address it prints.
        </Text>
        <View style={styles.serverRow}>
          <TextInput
            style={styles.serverInput}
            value={server}
            onChangeText={(t) => { setServer(t); setSaved(false); }}
            placeholder="http://192.168.1.5:8000"
            placeholderTextColor={colors.mutedSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="Karaoke server address"
          />
          <Pressable
            onPress={saveServer}
            disabled={saved}
            style={[styles.serverBtn, saved && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={styles.serverBtnText}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>

      {user ? (
        <Pressable onPress={signOut} style={styles.signOut} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setGuestMode(false)}
          style={[styles.signOut, { backgroundColor: colors.amber }]}
          accessibilityRole="button"
        >
          <Ionicons name="person-add-outline" size={20} color={colors.ink} />
          <Text style={[styles.signOutText, { color: colors.ink }]}>Create an account or sign in</Text>
        </Pressable>
      )}

      <Text style={styles.footer}>Himig · Karaoke that works offline</Text>
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Row({ icon, label, meta }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.amber} /></View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Text style={styles.rowMeta}>{meta}</Text>
    </View>
  );
}
const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: 120 },
  hero: { alignItems: 'center', marginBottom: space.lg },
  avatar: {
    width: 92, height: 92, borderRadius: radius.pill, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  name: { color: colors.cream, fontSize: 22, fontWeight: '900', marginTop: space.md },
  handle: { color: colors.teal, fontSize: 13, fontWeight: '600', marginTop: 2 },
  statRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  statCard: {
    flex: 1, backgroundColor: colors.inkSoft, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.hairline, paddingVertical: space.md, alignItems: 'center', ...shadow.card,
  },
  statValue: { color: colors.amber, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2, fontWeight: '600' },
  section: { color: colors.cream, fontSize: 15, fontWeight: '800', marginBottom: space.sm, marginTop: space.sm },
  card: {
    backgroundColor: colors.inkSoft, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: space.md, marginBottom: space.lg, ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowIcon: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.inkSofter,
    alignItems: 'center', justifyContent: 'center', marginRight: space.md,
  },
  rowLabel: { color: colors.cream, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.mutedSoft, fontSize: 12, marginTop: 2 },
  rowMeta: { color: colors.mutedSoft, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.hairline },
  serverHelp: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  serverRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  serverInput: {
    flex: 1, minHeight: 48, backgroundColor: colors.inkSofter, borderRadius: radius.md,
    paddingHorizontal: space.md, color: colors.cream, fontSize: 15,
  },
  serverBtn: {
    minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  serverBtnText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  footer: { color: colors.mutedSoft, fontSize: 12, textAlign: 'center', marginTop: space.sm },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.inkSoft, borderRadius: radius.md, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.hairline,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
