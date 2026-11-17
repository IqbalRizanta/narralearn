import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  refreshAccessToken,
  setAccessToken,
} from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    consent_accepted: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  acceptConsent: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = "narralearn:cached-user";

function readCachedUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    return typeof parsed.id === "string" && typeof parsed.email === "string"
      ? (parsed as User)
      : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null): void {
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Storage can be unavailable in private mode; online auth still works.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const cached = readCachedUser();

    const bootstrap = async () => {
      // Offline reloads cannot rotate the HttpOnly refresh cookie, so keep the
      // last non-sensitive profile for cached/offline reading.
      if (typeof navigator !== "undefined" && !navigator.onLine && cached) {
        setUser(cached);
        setLoading(false);
        return;
      }

      const token = await refreshAccessToken();
      if (!active) return;
      if (!token) {
        if (cached && typeof navigator !== "undefined" && !navigator.onLine) {
          setUser(cached);
        }
        setLoading(false);
        return;
      }
      try {
        const current = await api.me();
        if (active) {
          setUser(current);
          writeCachedUser(current);
        }
      } catch {
        if (active) {
          setUser(null);
          writeCachedUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    const onUnauthorized = () => {
      setAccessToken(null);
      setUser(null);
      writeCachedUser(null);
      setLoading(false);
    };
    window.addEventListener("narralearn:unauthorized", onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("narralearn:unauthorized", onUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setAccessToken(data.access_token);
    setUser(data.user);
    writeCachedUser(data.user);
  }, []);

  const register = useCallback(
    async (payload: {
      full_name: string;
      email: string;
      password: string;
      consent_accepted: boolean;
    }) => {
      const data = await api.register({
        ...payload,
        consent_version: "1.0",
      });
      setAccessToken(data.access_token);
      setUser(data.user);
      writeCachedUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The local session is cleared even if the network call fails.
    }
    setAccessToken(null);
    setUser(null);
    writeCachedUser(null);
  }, []);

  const acceptConsent = useCallback(async () => {
    const updated = await api.acceptConsent("1.0");
    setUser(updated);
    writeCachedUser(updated);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await api.deleteAccount(password);
    setAccessToken(null);
    setUser(null);
    writeCachedUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await api.me();
    setUser(current);
    writeCachedUser(current);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      acceptConsent,
      deleteAccount,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      acceptConsent,
      deleteAccount,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }
  return context;
}
