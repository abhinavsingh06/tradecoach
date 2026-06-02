import { getSessionToken } from '../auth/session';
import type { VoiceMemo } from '../types';
import { ApiError, getBaseUrl } from './http';

export interface TranscribeOptions {
  roundTripId?: string;
  durationMs?: number;
  structure?: boolean;
  mimeType?: string;
}

/**
 * Upload a recorded voice memo to the backend for transcription + optional
 * structured extraction (emotion / setup / notes). Uses `multipart/form-data`
 * directly because the shared JSON request helper doesn't handle file uploads.
 */
export const transcribeVoice = async (
  uri: string,
  opts: TranscribeOptions = {},
): Promise<{ memo: VoiceMemo }> => {
  const token = await getSessionToken();
  if (!token) throw new ApiError('Not signed in', 401, 'no_session');

  const form = new FormData();
  form.append('audio', {
    uri,
    name: 'memo.m4a',
    type: opts.mimeType ?? 'audio/m4a',
  } as unknown as Blob);
  if (opts.roundTripId) form.append('roundTripId', opts.roundTripId);
  if (opts.durationMs != null) {
    form.append('durationMs', String(opts.durationMs));
  }
  if (opts.structure) form.append('structure', 'true');

  const res = await fetch(`${getBaseUrl()}/voice/transcribe`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });

  const text = await res.text();
  let body: { error?: string; message?: string } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    /* non-json body */
  }

  if (!res.ok) {
    throw new ApiError(
      body.message ?? body.error ?? `Request failed (${res.status})`,
      res.status,
      body.error,
    );
  }

  return JSON.parse(text) as { memo: VoiceMemo };
};
