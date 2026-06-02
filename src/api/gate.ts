import type { PreTradeGateResult } from '../types';
import { request } from './http';

export interface GateRequestBody {
  tradingsymbol: string;
  side: 'long' | 'short';
  quantity?: number | null;
  intendedPrice?: number | null;
  setup?: string | null;
  reason?: string | null;
  conviction?: number | null;
}

export const runPreTradeGate = (body: GateRequestBody) =>
  request<{ gate: PreTradeGateResult }>('/gate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const setGateAction = (gateId: string, action: 'took' | 'skipped') =>
  request<{ ok: boolean }>(`/gate/${gateId}/action`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
