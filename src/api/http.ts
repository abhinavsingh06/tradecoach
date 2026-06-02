// Core HTTP helpers shared by every API module. Owns:
//   • base-URL resolution (env first, sensible localhost default for `expo start`)
//   • the global `ApiError` shape exposed to callers
//   • the `request<T>()` JSON helper with bearer auth + structured error mapping
//
// Domain modules (`auth`, `trades`, `coach`, …) import only from this file —
// keep this file free of feature-specific concerns.

import Constants from 'expo-constants';

import { getSessionToken } from '../auth/session';

const DEFAULT_DEV_BASE_URL = 'http://localhost:4000';

let warnedAboutMissingBaseUrl = false;

/**
 * Resolve the backend base URL.
 *
 * Resolution order:
 *   1. `EXPO_PUBLIC_API_URL` (set per profile in `eas.json`, or in `.env`)
 *   2. `expo.extra.apiUrl` (legacy escape hatch; rarely used)
 *   3. Localhost — only sensible for `expo start` on a simulator.
 *
 * In production builds, falling all the way through to localhost is a
 * configuration bug. We log a single warning so it shows up in Sentry / the
 * console rather than silently breaking every API call.
 */
export const getBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, '');

  if (!warnedAboutMissingBaseUrl && !__DEV__) {
    warnedAboutMissingBaseUrl = true;
    console.warn(
      '[TradeCoach] EXPO_PUBLIC_API_URL is not set — falling back to ' +
        `${DEFAULT_DEV_BASE_URL}. API requests will fail in production.`,
    );
  }

  return DEFAULT_DEV_BASE_URL;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  /** Set to `false` for endpoints that must be called without a bearer token. */
  auth?: boolean;
}

/**
 * Issue a JSON request against the backend. Adds the bearer token by default,
 * parses the response body as JSON (tolerating empty bodies), and converts
 * any non-2xx response into an `ApiError` carrying the server's `error` code
 * so call sites can branch on it.
 */
export const request = async <T>(
  path: string,
  init: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (init.auth !== false) {
    const token = await getSessionToken();
    if (!token) throw new ApiError('Not signed in', 401, 'no_session');
    headers.authorization = `Bearer ${token}`;
  }

  const base = getBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    const hint =
      base.includes('localhost') || base.includes('127.0.0.1')
        ? ' Is tradecoach-server running? (cd ../tradecoach-server && npm run dev)'
        : '';
    throw new ApiError(
      `Cannot reach API at ${base}${hint}`,
      0,
      'network_error',
    );
  }

  const text = await res.text();
  let body: { error?: string; message?: string } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    /* non-json body — keep `body` empty */
  }

  if (!res.ok) {
    throw new ApiError(
      body.message ?? body.error ?? `Request failed (${res.status})`,
      res.status,
      body.error,
    );
  }

  return (text ? JSON.parse(text) : {}) as T;
};
