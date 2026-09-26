import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function ProfileScreen() {
  const { artists } = useApp();
  const { user, signOut } = useAuth();
  const favorites = artists.filter((a) => a.favorite).length;
  const custom = artists.filter((a) => a.custom).length;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.ink} />
        </View>
        <Text style={styles.name}>{user?.name || 'OPM Fan'}</Text>
        <Text style={styles.handle}>{user?.email || 'Listening since 2024'}</Text>
      </View>

      <View style={styles.statRow}>
        <Stat value={artists.length} label="Artists" />
        <Stat value={favorites} label="Favorites" />
        <Stat value={custom} label="Added" />
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <Row icon="musical-notes-outline" label="Library" meta={`${artists.length} artists`} />
        <Divider />
        <Row icon="heart-outline" label="Favorites" meta={`${favorites}`} />
        <Divider />
        <Row icon="flame-outline" label="Trending" meta="Auto when online" />
        <Divider />
        <Row icon="information-circle-outline" label="Version" meta="1.0.0" />
      </View>

      <Pressable onPress={signOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.footer}>Himig · Offline-first OPM library</Text>
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
  footer: { color: colors.mutedSoft, fontSize: 12, textAlign: 'center', marginTop: space.sm },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.inkSoft, borderRadius: radius.md, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.hairline,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
