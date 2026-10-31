import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RegisterPayload, Role, User } from '../lib/types';
import { authenticate, bootstrap, findUserById, registerUser } from '../lib/db';
import { clearSession, issueJwt, loadSessionToken, saveSession, verifyJwt } from '../lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  booting: boolean;
  login: (loginId: string, password: string, roleHint?: Role) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const hydrate = useCallback(async () => {
    await bootstrap();
    const stored = await loadSessionToken();
    if (!stored) {
      setBooting(false);
      return;
    }
    const session = verifyJwt(stored);
    if (!session) {
      await clearSession();
      setBooting(false);
      return;
    }
    const u = await findUserById(session.userId);
    if (!u) {
      await clearSession();
      setBooting(false);
      return;
    }
    setToken(stored);
    setUser(u);
    setBooting(false);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (loginId: string, password: string, roleHint?: Role) => {
    const u = await authenticate(loginId, password, roleHint);
    const jwt = issueJwt(u);
    await saveSession(jwt);
    setToken(jwt);
    setUser(u);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const u = await registerUser(payload);
    const jwt = issueJwt(u);
    await saveSession(jwt);
    setToken(jwt);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const u = await findUserById(user.id);
    if (u) setUser(u);
  }, [user]);

  const value = useMemo(
    () => ({ user, token, booting, login, register, logout, refresh }),
    [user, token, booting, login, register, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
