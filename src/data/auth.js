import AsyncStorage from '@react-native-async-storage/async-storage';

// Local, offline auth (no backend). Accounts + session live on the device.
// ponytail: passwords are stored locally in plain text — fine for an offline
// demo app; swap for a hashed store / real backend if this ever ships for real.
const K_ONBOARDED = '@himig/onboarded';
const K_USERS = '@himig/users';
const K_SESSION = '@himig/session';

const read = async (k, f) => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v != null ? JSON.parse(v) : f;
  } catch {
    return f;
  }
};
const write = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export const getOnboarded = () => read(K_ONBOARDED, false);
export const setOnboarded = () => write(K_ONBOARDED, true);

const publicUser = (u) => (u ? { name: u.name, email: u.email } : null);

export async function getSession() {
  const email = await read(K_SESSION, null);
  if (!email) return null;
  const users = await read(K_USERS, []);
  return publicUser(users.find((u) => u.email === email));
}

export async function signUp({ name, email, password }) {
  email = email.trim().toLowerCase();
  const users = await read(K_USERS, []);
  if (users.some((u) => u.email === email)) {
    throw new Error('An account with that email already exists.');
  }
  const user = { name: name.trim(), email, password };
  await write(K_USERS, [...users, user]);
  await write(K_SESSION, email);
  return publicUser(user);
}

export async function signIn({ email, password }) {
  email = email.trim().toLowerCase();
  const users = await read(K_USERS, []);
  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    throw new Error('Wrong email or password.');
  }
  await write(K_SESSION, email);
  return publicUser(user);
}

export const signOut = () => AsyncStorage.removeItem(K_SESSION).catch(() => {});
