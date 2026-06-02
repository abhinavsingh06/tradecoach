import { useCallback, useState } from 'react';

import { ApiError, coachChat, type CoachChatTurn } from '../api';
import { useTradeStore } from '../store/tradeStore';

export interface SendOptions {
  signal?: AbortSignal;
}

export const useCoach = () => {
  const messages = useTradeStore((s) => s.messages);
  const addMessage = useTradeStore((s) => s.addMessage);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachOffline, setCoachOffline] = useState(false);
  const [needsPro, setNeedsPro] = useState(false);

  const send = useCallback(
    async (text: string, opts?: SendOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ role: 'user', content: trimmed });

      setLoading(true);
      setError(null);

      const history: CoachChatTurn[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ];

      try {
        const { reply } = await coachChat(history, { signal: opts?.signal });
        addMessage({ role: 'assistant', content: reply });
        setCoachOffline(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        const offline =
          e instanceof ApiError &&
          (e.code === 'coach_offline' || e.status === 503);
        const pro =
          e instanceof ApiError &&
          (e.code === 'pro_required' || e.status === 402);
        const limited =
          e instanceof ApiError &&
          (e.code === 'daily_quota_exceeded' || e.status === 429);
        setCoachOffline(offline);
        setNeedsPro(pro);
        setError(msg);
        const quota =
          msg.includes('quota') ||
          msg.includes('billing') ||
          msg.includes('insufficient_quota');
        addMessage({
          role: 'assistant',
          content: offline
            ? "Coach is temporarily unavailable. Please try again later."
            : pro
              ? "Coach chat is part of TradeCoach Pro. Tap the Settings icon → Subscription to start a free trial."
              : limited
                ? "You've hit today's coach limit. It resets at midnight IST, or upgrade to Pro for higher limits."
                : quota
                  ? "Coach is unavailable right now. Please try again later."
                  : `Something went wrong: ${msg.slice(0, 280)}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [addMessage, messages],
  );

  return { send, loading, error, coachOffline, needsPro, messages };
};
