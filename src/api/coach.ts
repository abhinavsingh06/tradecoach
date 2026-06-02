import { getSessionToken } from '../auth/session';
import type {
  AiDraft,
  AnalyticsReport,
  CostsReport,
  DailyReview,
  IdentityReport,
  PlaybookReport,
  TaxReport,
  TodaySnapshot,
  TradingPlan,
  WeeklyReport,
} from '../types';
import { ApiError, getBaseUrl, request } from './http';

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

export const fetchIdentity = () =>
  request<{
    report: IdentityReport | null;
    reason?: string;
    have?: number;
    minTrades?: number;
    generatedAt?: string;
  }>('/coach/identity');

export const fetchPlaybook = () => request<PlaybookReport>('/coach/playbook');

export const fetchTaxReport = (year: number) =>
  request<TaxReport>(`/coach/tax/${year}`);

/**
 * Build a full URL to the trades CSV export, with the auth token baked into
 * a one-shot query param. Used by the Settings screen "Export trades" button —
 * we can't set headers when using Linking / browser download.
 */
export const buildExportTradesUrl = async (): Promise<string> => {
  const token = await getSessionToken();
  if (!token) throw new ApiError('Not signed in', 401, 'no_session');
  const params = `?token=${encodeURIComponent(token)}`;
  return `${getBaseUrl()}/coach/export/trades.csv${params}`;
};
