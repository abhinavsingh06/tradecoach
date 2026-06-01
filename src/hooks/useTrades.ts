import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import {
  ApiError,
  fetchPositions,
  fetchTrades,
  saveJournal,
  syncTrades,
} from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export const tradeKeys = {
  all: ['trades'] as const,
  list: () => [...tradeKeys.all, 'list'] as const,
  positions: () => [...tradeKeys.all, 'positions'] as const,
};

export const useTradesQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: tradeKeys.list(),
    queryFn: async () => {
      const { trades } = await fetchTrades();
      return trades.sort(
        (a, b) =>
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
      );
    },
    enabled: !!user,
  });
};

export const usePositionsQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: tradeKeys.positions(),
    queryFn: async () => {
      const { positions } = await fetchPositions();
      return positions;
    },
    enabled: !!user,
  });
};

export const useSyncTrades = () => {
  const qc = useQueryClient();
  const { refresh: refreshAuth } = useAuth();
  return useMutation({
    mutationFn: syncTrades,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: tradeKeys.all });
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.code === 'kite_unauthorized') {
        await refreshAuth();
      }
    },
  });
};

export const useSaveJournal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tradeId,
      ...data
    }: {
      tradeId: string;
      emotion?: string | null;
      setup?: string | null;
      notes?: string | null;
    }) => saveJournal(tradeId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tradeKeys.list() }),
  });
};

/**
 * Triggers `/trades/sync` at most once every `MIN_INTERVAL_MS` per app
 * session, regardless of how many times `run()` is called. Without this
 * throttle the dashboard would loop: sync → invalidate queries → refetch →
 * components re-render → useEffect fires again → sync.
 */
const MIN_INTERVAL_MS = 60_000;
let lastSyncAt = 0;
let inflight = false;

export const useAutoSync = () => {
  const { user, kiteConnected } = useAuth();
  const sync = useSyncTrades();
  // We hold a ref to the mutation function so `run` can stay referentially
  // stable across renders. React-query gives us a new `sync` object each
  // render even when nothing changed.
  const mutateRef = useRef(sync.mutate);
  mutateRef.current = sync.mutate;

  const userId = user?.id ?? null;
  const enabled = !!userId && kiteConnected;

  const run = useCallback(() => {
    if (!enabled || inflight) return;
    const now = Date.now();
    if (now - lastSyncAt < MIN_INTERVAL_MS) return;
    lastSyncAt = now;
    inflight = true;
    mutateRef.current(undefined, {
      onSettled: () => {
        inflight = false;
      },
    });
  }, [enabled]);

  // Auto-sync once when the user becomes signed in. The throttle above
  // prevents repeat triggers.
  useEffect(() => {
    if (enabled) run();
  }, [enabled, run]);

  return { sync, run };
};
