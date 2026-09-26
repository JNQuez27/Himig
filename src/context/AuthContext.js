import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import * as auth from '../data/auth';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const [ob, session] = await Promise.all([
        auth.getOnboarded(),
        auth.getSession(),
      ]);
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

  const value = { ready, onboarded, user, finishOnboarding, signUp, signIn, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
