// OAuth redirect plumbing shared by AuthProvider. Native uses the
// `tradecoach://auth/complete` deep link; web does a full-page redirect to
// `${origin}/auth/complete` and we pluck the token from `location` on boot.
//
// Keeping this isolated from AuthProvider means the React provider doesn't
// have to know about `window`, deep-link schemes, or query-string parsing.

import { Platform } from 'react-native';

import { setSessionToken } from './session';

export const NATIVE_REDIRECT = 'tradecoach://auth/complete';

/** Where Zerodha should send the browser back to in a web (`expo start --web`) session. */
export const getWebRedirect = (): string => {
  if (typeof window === 'undefined') return NATIVE_REDIRECT;
  return `${window.location.origin}/auth/complete`;
};

export interface ParsedRedirect {
  token?: string;
  error?: string;
}

export const parseTokenFromUrl = (url: string): ParsedRedirect => {
  try {
    const parsed = new URL(url);
    const err = parsed.searchParams.get('error');
    if (err) return { error: err };
    const token = parsed.searchParams.get('token');
    return token ? { token } : {};
  } catch {
    return {};
  }
};

/**
 * On web the OAuth callback lands at `${origin}/auth/complete?token=...`.
 * If there's a token, persist it and clean up the URL so a page refresh
 * doesn't re-trigger anything. Returns the captured token (if any).
 *
 * Throws on `?error=...` so the caller can surface the error to the UI.
 * No-op (returns `null`) on native — native uses `WebBrowser.openAuthSessionAsync`.
 */
export const consumeWebRedirect = async (): Promise<string | null> => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const { token, error } = parseTokenFromUrl(window.location.href);

  if (token) {
    await setSessionToken(token);
    const clean = new URL(window.location.href);
    clean.searchParams.delete('token');
    clean.searchParams.delete('error');
    clean.pathname = '/';
    window.history.replaceState({}, '', clean.toString());
    return token;
  }

  if (error) {
    const clean = new URL(window.location.href);
    clean.searchParams.delete('error');
    window.history.replaceState({}, '', clean.toString());
    throw new Error(`Kite login failed: ${error}`);
  }

  return null;
};
