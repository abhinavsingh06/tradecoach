import Constants from 'expo-constants';

import { getSessionToken } from '../auth/session';
import type {
  AiDraft,
  AnalyticsReport,
  AuthUser,
  CostsReport,
  DailyReview,
  Entitlement,
  IdentityReport,
  LossRecovery,
  MoodCheckin,
  MoodCorrelationBucket,
  OpenPosition,
  PlaybookReport,
  PreTradeGateResult,
  SimilarTrade,
  SubscriptionInfo,
  SymbolStats,
  TaxReport,
  TodaySnapshot,
  Trade,
  TradingPlan,
  VoiceMemo,
  WeeklyReport,
} from '../types';

const getBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  return 'http://localhost:4000';
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

const request = async <T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
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
  } catch (err) {
    const hint =
      base.includes('localhost') || base.includes('127.0.0.1')
        ? ` Is tradecoach-server running? (cd ../tradecoach-server && npm run dev)`
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
    /* non-json */
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

export const startKiteLogin = (redirectUrl: string) =>
  request<{ loginUrl: string; state: string }>('/auth/kite/start', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ redirectUrl }),
  });

export const fetchMe = () =>
  request<{
    user: AuthUser;
    kite: { connected: boolean; expiresAt: string | null };
    entitlement: Entitlement;
    aiEnabled: boolean;
  }>('/auth/me');

export const logout = () =>
  request<{ ok: boolean }>('/auth/logout', { method: 'POST' });

export const deleteAccount = () =>
  request<{ ok: boolean; deleted: string }>('/auth/me', { method: 'DELETE' });

export const fetchSubscription = () =>
  request<SubscriptionInfo>('/subscription/me');

export const startProTrial = () =>
  request<{ started: boolean; entitlement: Entitlement }>(
    '/subscription/trial',
    { method: 'POST' },
  );

export const startProCheckout = () =>
  request<{ status: string; message: string }>('/subscription/checkout', {
    method: 'POST',
  });

export const adminGrantPro = () =>
  request<{ ok: boolean }>('/subscription/_admin/grant', { method: 'POST' });

export const fetchLegalLinks = () =>
  request<{ privacy: string; terms: string; support: string }>(
    '/legal/links',
    { auth: false },
  );

export const fetchTrades = () =>
  request<{ trades: Trade[] }>('/trades');

export const fetchPositions = () =>
  request<{ positions: OpenPosition[] }>('/trades/positions');

export const syncTrades = () =>
  request<{
    ok: boolean;
    newFills: number;
    totalFills: number;
    roundTrips: number;
    openPositions: number;
  }>('/trades/sync', { method: 'POST' });

export const saveJournal = (
  tradeId: string,
  data: { emotion?: string | null; setup?: string | null; notes?: string | null },
) =>
  request<{ ok: boolean }>(`/trades/${tradeId}/journal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const fetchSimilarTrades = (tradeId: string) =>
  request<{ similar: SimilarTrade[] }>(`/trades/${tradeId}/similar`);

export const fetchSymbolStats = (symbol: string) =>
  request<SymbolStats>(`/trades/symbol/${encodeURIComponent(symbol)}/stats`);

export const fetchToday = () => request<TodaySnapshot>('/coach/today');

export const fetchWeeklyReport = () => request<WeeklyReport>('/coach/weekly');

export const fetchTodayPlan = () =>
  request<{ plan: TradingPlan | null; tradingDate: string }>('/plans/today');

export const saveTodayPlan = (plan: {
  intention?: string | null;
  maxLossRupees?: number | null;
  maxTrades?: number | null;
  plannedSetups?: string[];
  stopRule?: string | null;
}) =>
  request<{ ok: boolean }>('/plans/today', {
    method: 'POST',
    body: JSON.stringify(plan),
  });

export const generateDebrief = () =>
  request<{ review: DailyReview }>('/coach/debrief', { method: 'POST' });

export const requestJournalDraft = (tradeId: string) =>
  request<{ draft: AiDraft }>(`/coach/journal/${tradeId}/draft`, {
    method: 'POST',
  });

export const acceptJournalDraft = (tradeId: string) =>
  request<{ ok: boolean }>(`/coach/journal/${tradeId}/accept`, {
    method: 'POST',
  });

export interface CoachChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const coachChat = (
  messages: CoachChatTurn[],
  opts?: { signal?: AbortSignal },
) =>
  request<{ reply: string; model: string }>('/coach/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
    signal: opts?.signal,
  });

export const fetchCosts = () => request<CostsReport>('/coach/costs');

export const fetchAnalytics = () =>
  request<AnalyticsReport>('/coach/analytics');

/**
 * Build a full URL to the trades CSV export, with the auth token baked into
 * a one-shot query param. Used by the Settings screen "Export trades" button.
 * (We can't set headers when using Linking / browser download.)
 */
export const buildExportTradesUrl = async (): Promise<string> => {
  const token = await getSessionToken();
  const base = getBaseUrl();
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/coach/export/trades.csv${params}`;
};

export const fetchIdentity = () =>
  request<{
    report: IdentityReport | null;
    reason?: string;
    have?: number;
    minTrades?: number;
    generatedAt?: string;
  }>('/coach/identity');

export const fetchPlaybook = () =>
  request<PlaybookReport>('/coach/playbook');

export const fetchTaxReport = (year: number) =>
  request<TaxReport>(`/coach/tax/${year}`);

export const runPreTradeGate = (body: {
  tradingsymbol: string;
  side: 'long' | 'short';
  quantity?: number | null;
  intendedPrice?: number | null;
  setup?: string | null;
  reason?: string | null;
  conviction?: number | null;
}) =>
  request<{ gate: PreTradeGateResult }>('/gate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const setGateAction = (gateId: string, action: 'took' | 'skipped') =>
  request<{ ok: boolean }>(`/gate/${gateId}/action`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const fetchMoodToday = () =>
  request<{ mood: MoodCheckin | null; tradingDate: string }>(
    '/wellness/mood/today',
  );

export const saveMood = (body: {
  sleepHours?: number | null;
  energy?: number | null;
  stress?: number | null;
  focus?: number | null;
  note?: string | null;
}) =>
  request<{ mood: MoodCheckin }>('/wellness/mood', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchMoodCorrelation = () =>
  request<{
    windowDays: number;
    checkins: number;
    sleep: MoodCorrelationBucket[];
    stress: MoodCorrelationBucket[];
  }>('/wellness/mood/correlation');

export const fetchActiveRecovery = () =>
  request<{ recovery: LossRecovery | null }>('/wellness/recovery/active');

export const startRecovery = (body: {
  triggerReason: 'big_loss' | 'consecutive_losses' | 'manual';
  triggerPnl?: number;
}) =>
  request<{ recovery: LossRecovery; reused?: boolean }>(
    '/wellness/recovery/start',
    { method: 'POST', body: JSON.stringify(body) },
  );

export const recoveryStep = (
  id: string,
  body: {
    step: 'closedPositions' | 'reflection' | 'startCooldown' | 'tomorrowPlan';
    reflection?: string | null;
  },
) =>
  request<{ recovery: LossRecovery; completed: boolean }>(
    `/wellness/recovery/${id}/step`,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const fetchStreaks = () =>
  request<{
    streaks: { kind: string; label: string; currentStreak: number }[];
  }>('/wellness/streaks');

export const transcribeVoice = async (
  uri: string,
  opts: {
    roundTripId?: string;
    durationMs?: number;
    structure?: boolean;
    mimeType?: string;
  } = {},
): Promise<{ memo: VoiceMemo }> => {
  const token = await getSessionToken();
  if (!token) throw new ApiError('Not signed in', 401, 'no_session');
  const base = getBaseUrl();
  const form = new FormData();
  form.append('audio', {
    uri,
    name: 'memo.m4a',
    type: opts.mimeType ?? 'audio/m4a',
  } as unknown as Blob);
  if (opts.roundTripId) form.append('roundTripId', opts.roundTripId);
  if (opts.durationMs != null)
    form.append('durationMs', String(opts.durationMs));
  if (opts.structure) form.append('structure', 'true');

  const res = await fetch(`${base}/voice/transcribe`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  let body: { error?: string; message?: string } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    /* */
  }
  if (!res.ok) {
    throw new ApiError(
      body.message ?? body.error ?? `Request failed (${res.status})`,
      res.status,
      body.error,
    );
  }
  return JSON.parse(text) as { memo: VoiceMemo };
};
