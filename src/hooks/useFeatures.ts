import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchActiveRecovery,
  fetchAnalytics,
  fetchCosts,
  fetchIdentity,
  fetchMoodCorrelation,
  fetchMoodToday,
  fetchPlaybook,
  fetchStreaks,
  fetchTaxReport,
  recoveryStep,
  runPreTradeGate,
  saveMood,
  setGateAction,
  startRecovery,
  transcribeVoice,
} from '../api';
import { useAuth } from '../auth/AuthProvider';
import { coachKeys } from './useToday';

export const featureKeys = {
  all: ['features'] as const,
  costs: () => [...featureKeys.all, 'costs'] as const,
  analytics: () => [...featureKeys.all, 'analytics'] as const,
  identity: () => [...featureKeys.all, 'identity'] as const,
  playbook: () => [...featureKeys.all, 'playbook'] as const,
  tax: (year: number) => [...featureKeys.all, 'tax', year] as const,
  mood: () => [...featureKeys.all, 'mood'] as const,
  moodCorr: () => [...featureKeys.all, 'moodCorr'] as const,
  recovery: () => [...featureKeys.all, 'recovery'] as const,
  streaks: () => [...featureKeys.all, 'streaks'] as const,
};

export const useCostsQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.costs(),
    queryFn: fetchCosts,
    enabled: !!user,
  });
};

export const useAnalyticsQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.analytics(),
    queryFn: fetchAnalytics,
    enabled: !!user,
  });
};

export const useIdentityQuery = (opts: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.identity(),
    queryFn: fetchIdentity,
    enabled: !!user && (opts.enabled ?? true),
    staleTime: 5 * 60_000,
  });
};

export const usePlaybookQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.playbook(),
    queryFn: fetchPlaybook,
    enabled: !!user,
  });
};

export const useTaxQuery = (year: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.tax(year),
    queryFn: () => fetchTaxReport(year),
    enabled: !!user,
  });
};

export const useMoodTodayQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.mood(),
    queryFn: fetchMoodToday,
    enabled: !!user,
  });
};

export const useMoodCorrelationQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.moodCorr(),
    queryFn: fetchMoodCorrelation,
    enabled: !!user,
  });
};

export const useSaveMood = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMood,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureKeys.mood() });
      qc.invalidateQueries({ queryKey: featureKeys.moodCorr() });
    },
  });
};

export const usePreTradeGate = () =>
  useMutation({ mutationFn: runPreTradeGate });

export const useGateAction = () =>
  useMutation({
    mutationFn: ({
      gateId,
      action,
    }: {
      gateId: string;
      action: 'took' | 'skipped';
    }) => setGateAction(gateId, action),
  });

export const useActiveRecoveryQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.recovery(),
    queryFn: fetchActiveRecovery,
    enabled: !!user,
    refetchInterval: 30_000,
  });
};

export const useStartRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startRecovery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureKeys.recovery() });
    },
  });
};

export const useRecoveryStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      step: 'closedPositions' | 'reflection' | 'startCooldown' | 'tomorrowPlan';
      reflection?: string | null;
    }) => recoveryStep(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureKeys.recovery() });
      qc.invalidateQueries({ queryKey: coachKeys.plan() });
      qc.invalidateQueries({ queryKey: coachKeys.today() });
    },
  });
};

export const useStreaksQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: featureKeys.streaks(),
    queryFn: fetchStreaks,
    enabled: !!user,
  });
};

export const useVoiceTranscribe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uri,
      ...opts
    }: {
      uri: string;
      roundTripId?: string;
      durationMs?: number;
      structure?: boolean;
      mimeType?: string;
    }) => transcribeVoice(uri, opts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureKeys.all });
    },
  });
};
