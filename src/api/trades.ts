import type { OpenPosition, SimilarTrade, SymbolStats, Trade } from '../types';
import { request } from './http';

export const fetchTrades = () => request<{ trades: Trade[] }>('/trades');

export const fetchPositions = () =>
  request<{ positions: OpenPosition[] }>('/trades/positions');

export interface SyncResult {
  ok: boolean;
  newFills: number;
  totalFills: number;
  roundTrips: number;
  openPositions: number;
}

export const syncTrades = () =>
  request<SyncResult>('/trades/sync', { method: 'POST' });

export const saveJournal = (
  tradeId: string,
  data: {
    emotion?: string | null;
    setup?: string | null;
    notes?: string | null;
  },
) =>
  request<{ ok: boolean }>(`/trades/${tradeId}/journal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const fetchSimilarTrades = (tradeId: string) =>
  request<{ similar: SimilarTrade[] }>(`/trades/${tradeId}/similar`);

export const fetchSymbolStats = (symbol: string) =>
  request<SymbolStats>(`/trades/symbol/${encodeURIComponent(symbol)}/stats`);
