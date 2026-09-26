import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/GradientBackground';
import { useAuth } from '../context/AuthContext';
import { colors, space, radius, shadow } from '../theme/colors';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async () => {
    setErr('');
    if (signup && !name.trim()) return setErr('Please enter your name.');
    if (!email.trim()) return setErr('Please enter your email.');
    if (password.length < 4) return setErr('Password must be at least 4 characters.');
    setBusy(true);
    try {
      if (signup) await signUp({ name, email, password });
      else await signIn({ email, password });
      // success -> AuthProvider sets the session and the navigator shows the app
    } catch (e) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logo}>
              <Ionicons name="musical-notes" size={40} color={colors.ink} />
            </View>
            <Text style={styles.brand}>Himig</Text>
            <Text style={styles.tagline}>
              {signup ? 'Create your account' : 'Welcome back'}
            </Text>

            <View style={styles.toggle}>
              <Pressable onPress={() => setMode('signin')} style={[styles.tab, !signup && styles.tabOn]}>
                <Text style={[styles.tabText, !signup && styles.tabTextOn]}>Sign In</Text>
              </Pressable>
              <Pressable onPress={() => setMode('signup')} style={[styles.tab, signup && styles.tabOn]}>
                <Text style={[styles.tabText, signup && styles.tabTextOn]}>Sign Up</Text>
              </Pressable>
            </View>

            {signup && (
              <Field icon="person-outline" placeholder="Name" value={name} onChangeText={setName} />
            )}
            <Field
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!!err && <Text style={styles.err}>{err}</Text>}

            <Pressable onPress={submit} style={styles.btn} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.btnText}>{signup ? 'Create account' : 'Sign In'}</Text>
              )}
            </Pressable>

            <Text style={styles.switch}>
              {signup ? 'Already have an account? ' : 'New to Himig? '}
              <Text
                style={styles.switchLink}
                onPress={() => { setErr(''); setMode(signup ? 'signin' : 'signup'); }}
              >
                {signup ? 'Sign in' : 'Create one'}
              </Text>
            </Text>

            <Text style={styles.note}>Your account stays on this device.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Field({ icon, ...props }) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={20} color={colors.mutedSoft} style={{ marginRight: space.sm }} />
      <TextInput style={styles.input} placeholderTextColor={colors.mutedSoft} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: space.lg, paddingTop: space.xl, flexGrow: 1, justifyContent: 'center' },
  logo: {
    width: 84, height: 84, borderRadius: radius.pill, backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', ...shadow.card,
  },
  brand: { color: colors.cream, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: space.md },
  tagline: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: space.lg },
  toggle: {
    flexDirection: 'row', backgroundColor: colors.inkSoft, borderRadius: radius.pill, padding: 4,
    marginBottom: space.lg, borderWidth: 1, borderColor: colors.hairline,
  },
  tab: { flex: 1, paddingVertical: 11, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.amber },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  tabTextOn: { color: colors.ink },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inkSoft,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: space.md, marginBottom: space.sm,
  },
  input: { flex: 1, paddingVertical: 14, color: colors.cream, fontSize: 15 },
  err: { color: colors.danger, fontSize: 13, marginTop: 4, marginBottom: 4, textAlign: 'center' },
  btn: {
    backgroundColor: colors.amber, borderRadius: radius.pill, paddingVertical: 16,
    alignItems: 'center', marginTop: space.md,
  },
  btnText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  switch: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: space.lg },
  switchLink: { color: colors.amber, fontWeight: '800' },
  note: { color: colors.mutedSoft, fontSize: 12, textAlign: 'center', marginTop: space.sm },
});
