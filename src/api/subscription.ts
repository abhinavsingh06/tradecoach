import type { Entitlement, SubscriptionInfo } from '../types';
import { request } from './http';

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
