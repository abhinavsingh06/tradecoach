import { request } from './http';

export const fetchLegalLinks = () =>
  request<{ privacy: string; terms: string; support: string }>(
    '/legal/links',
    { auth: false },
  );
