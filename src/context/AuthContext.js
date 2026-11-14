import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import * as auth from '../data/auth';
import { loadServerUrl } from '../data/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    (async () => {
      const [ob, session, g] = await Promise.all([
        auth.getOnboarded(),
        auth.getSession(),
        auth.getGuest(),
        loadServerUrl(), // before any screen talks to the server
      ]);
      setGuest(g);
      setOnboarded(ob);
      setUser(session);
      setReady(true);
    })();
  }, []);

  const finishOnboarding = useCallback(() => {
    auth.setOnboarded();
    setOnboarded(true);
  }, []);

  const signUp = useCallback(async (data) => {
    const u = await auth.signUp(data);
    setUser(u);
    return u;
  }, []);

  const signIn = useCallback(async (data) => {
    const u = await auth.signIn(data);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  // Skip the account: use the app as a guest. `false` reopens the sign-in screen.
  const setGuestMode = useCallback((on) => {
    auth.setGuest(on);
    setGuest(on);
  }, []);

  const value = {
    ready, onboarded, user, guest, finishOnboarding, signUp, signIn, signOut, setGuestMode,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
