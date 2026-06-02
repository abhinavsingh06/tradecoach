import type { AuthUser, Entitlement } from '../types';
import { request } from './http';

export const startKiteLogin = (redirectUrl: string) =>
  request<{ loginUrl: string; state: string }>('/auth/kite/start', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ redirectUrl }),
  });

export interface MeResponse {
  user: AuthUser;
  kite: { connected: boolean; expiresAt: string | null };
  entitlement: Entitlement;
  aiEnabled: boolean;
}

export const fetchMe = () => request<MeResponse>('/auth/me');

export const logout = () =>
  request<{ ok: boolean }>('/auth/logout', { method: 'POST' });

export const deleteAccount = () =>
  request<{ ok: boolean; deleted: string }>('/auth/me', { method: 'DELETE' });
