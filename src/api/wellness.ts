import type {
  LossRecovery,
  MoodCheckin,
  MoodCorrelationBucket,
} from '../types';
import { request } from './http';

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
