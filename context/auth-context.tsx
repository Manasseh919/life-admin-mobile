import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getMe, login as apiLogin, logout as apiLogout, refresh, register as apiRegister } from "@/lib/api";
import { clearTokens, getTokens, saveTokens } from "@/lib/auth-storage";
import type { UserMe } from "@/lib/types";

type AuthContextValue = {
  user: UserMe | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const tokens = await getTokens();
      if (!tokens) {
        setUser(null);
        return;
      }

      try {
        const me = await getMe(tokens.accessToken);
        setUser(me);
        return;
      } catch {
        const rotated = await refresh(tokens.refreshToken);
        await saveTokens(rotated);
        const me = await getMe(rotated.accessToken);
        setUser(me);
      }
    } catch {
      await clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    await saveTokens(response.tokens);
    setUser(response.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await apiRegister(email, password);
    await saveTokens(response.tokens);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = await getTokens();
    if (tokens) {
      try {
        await apiLogout(tokens.refreshToken);
      } catch {
        // If logout request fails, we still clear local session.
      }
    }
    await clearTokens();
    setUser(null);
  }, []);

  const getValidAccessToken = useCallback(async () => {
    const tokens = await getTokens();
    if (!tokens) {
      throw new Error("No active session.");
    }

    try {
      await getMe(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      const rotated = await refresh(tokens.refreshToken);
      await saveTokens(rotated);
      return rotated.accessToken;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      getValidAccessToken,
    }),
    [getValidAccessToken, isLoading, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
