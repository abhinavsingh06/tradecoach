import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminGrantPro,
  fetchLegalLinks,
  fetchSubscription,
  startProCheckout,
  startProTrial,
} from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export const subKeys = {
  all: ['subscription'] as const,
  me: () => [...subKeys.all, 'me'] as const,
  legal: () => [...subKeys.all, 'legal'] as const,
};

export const useSubscriptionQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: subKeys.me(),
    queryFn: fetchSubscription,
    enabled: !!user,
    staleTime: 30_000,
  });
};

export const useStartTrial = () => {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: startProTrial,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: subKeys.me() });
      await refresh();
    },
  });
};

export const useStartCheckout = () =>
  useMutation({ mutationFn: startProCheckout });

export const useAdminGrant = () => {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: adminGrantPro,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: subKeys.me() });
      await refresh();
    },
  });
};

export const useLegalLinksQuery = () =>
  useQuery({ queryKey: subKeys.legal(), queryFn: fetchLegalLinks });
