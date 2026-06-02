import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  ApiError,
  deleteAccount as apiDeleteAccount,
  fetchMe,
  logout as apiLogout,
  startKiteLogin,
} from '../api';
import type { AuthUser, Entitlement } from '../types';
import {
  NATIVE_REDIRECT,
  consumeWebRedirect,
  getWebRedirect,
  parseTokenFromUrl,
} from './redirect';
import { clearSessionToken, getSessionToken, setSessionToken } from './session';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: AuthUser | null;
  kiteConnected: boolean;
  kiteExpiresAt: string | null;
  entitlement: Entitlement | null;
  /**
   * True when the server has `OPENAI_API_KEY` set. When false the app runs in
   * "Lite" mode — AI-only surfaces are hidden.
   */
  aiEnabled: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  /**
   * True when the server has AI configured AND the user has an active Pro
   * entitlement (paid or trial). Every Pro-only AI surface (debrief, AI
   * draft, voice memo, identity, weekly narrative, coach chat tab) should
   * gate on this — otherwise free users see UI that always fails with 402.
   *
   * `aiEnabled` (server has key) is still used for UI that's only about
   * Lite mode vs. server config (e.g. "set OPENAI_API_KEY" banners).
   */
  aiPro: boolean;
  signInWithKite: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  completeLoginFromUrl: (url: string) => Promise<boolean>;
}

const INITIAL_STATE: AuthState = {
  user: null,
  kiteConnected: false,
  kiteExpiresAt: null,
  entitlement: null,
  aiEnabled: false,
  loading: true,
  error: null,
};

const SIGNED_OUT_STATE: AuthState = { ...INITIAL_STATE, loading: false };

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const applyMe = useCallback(async () => {
    const me = await fetchMe();
    setState({
      user: me.user,
      kiteConnected: me.kite.connected,
      kiteExpiresAt: me.kite.expiresAt,
      entitlement: me.entitlement,
      aiEnabled: me.aiEnabled,
      loading: false,
      error: null,
    });
  }, []);

  const refresh = useCallback(async () => {
    // If we just came back from a web OAuth redirect, grab the token first.
    try {
      await consumeWebRedirect();
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Login failed',
      }));
      return;
    }

    const token = await getSessionToken();
    if (!token) {
      setState((s) => ({ ...s, user: null, loading: false }));
      return;
    }

    try {
      await applyMe();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearSessionToken();
        setState(SIGNED_OUT_STATE);
        return;
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load profile',
      }));
    }
  }, [applyMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completeLoginFromUrl = useCallback(
    async (url: string): Promise<boolean> => {
      const { token, error } = parseTokenFromUrl(url);
      if (error) throw new Error(`Kite login failed: ${error}`);
      if (!token) return false;
      await setSessionToken(token);
      await applyMe();
      return true;
    },
    [applyMe],
  );

  const signInWithKite = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));

    if (Platform.OS === 'web') {
      // Full-page redirect: Zerodha → our callback → back to /auth/complete.
      const { loginUrl } = await startKiteLogin(getWebRedirect());
      window.location.href = loginUrl;
      return;
    }

    // Native: open an in-app browser session and wait for the deep link.
    const { loginUrl } = await startKiteLogin(NATIVE_REDIRECT);
    const result = await WebBrowser.openAuthSessionAsync(
      loginUrl,
      NATIVE_REDIRECT,
    );
    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      throw new Error('Kite login did not complete');
    }
    const ok = await completeLoginFromUrl(result.url);
    if (!ok) throw new Error('No session token in redirect');
  }, [completeLoginFromUrl]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Token may already be invalid server-side — still clear locally.
    }
    await clearSessionToken();
    setState(SIGNED_OUT_STATE);
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await apiDeleteAccount();
    } catch {
      // Even if the call fails, locally clear and force re-login.
    }
    await clearSessionToken();
    setState(SIGNED_OUT_STATE);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      aiPro: state.aiEnabled && !!state.entitlement?.pro,
      signInWithKite,
      signOut,
      deleteAccount,
      refresh,
      completeLoginFromUrl,
    }),
    [state, signInWithKite, signOut, deleteAccount, refresh, completeLoginFromUrl],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
