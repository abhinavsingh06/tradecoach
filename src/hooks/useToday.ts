import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptJournalDraft,
  fetchSimilarTrades,
  fetchSymbolStats,
  fetchToday,
  fetchTodayPlan,
  fetchWeeklyReport,
  generateDebrief,
  requestJournalDraft,
  saveTodayPlan,
} from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { tradeKeys } from './useTrades';

export const coachKeys = {
  all: ['coach'] as const,
  today: () => [...coachKeys.all, 'today'] as const,
  weekly: () => [...coachKeys.all, 'weekly'] as const,
  plan: () => [...coachKeys.all, 'plan', 'today'] as const,
  similar: (id: string) => [...coachKeys.all, 'similar', id] as const,
  symbol: (symbol: string) => [...coachKeys.all, 'symbol', symbol] as const,
};

export const useTodayQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: coachKeys.today(),
    queryFn: fetchToday,
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};

export const useWeeklyReportQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: coachKeys.weekly(),
    queryFn: fetchWeeklyReport,
    enabled: !!user,
  });
};

export const useTodayPlanQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: coachKeys.plan(),
    queryFn: fetchTodayPlan,
    enabled: !!user,
  });
};

export const useSaveTodayPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveTodayPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachKeys.plan() });
      qc.invalidateQueries({ queryKey: coachKeys.today() });
    },
  });
};

export const useDebrief = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateDebrief,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachKeys.today() });
      qc.invalidateQueries({ queryKey: coachKeys.weekly() });
    },
  });
};

export const useSimilarTrades = (tradeId: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: coachKeys.similar(tradeId ?? ''),
    queryFn: () => fetchSimilarTrades(tradeId!),
    enabled: !!user && !!tradeId,
  });
};

export const useSymbolStats = (symbol: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: coachKeys.symbol(symbol ?? ''),
    queryFn: () => fetchSymbolStats(symbol!),
    enabled: !!user && !!symbol,
  });
};

export const useJournalDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => requestJournalDraft(tradeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tradeKeys.list() });
    },
  });
};

export const useAcceptDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => acceptJournalDraft(tradeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tradeKeys.list() });
    },
  });
};
