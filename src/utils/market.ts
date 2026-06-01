// NSE / BSE session helpers. Both run Mon-Fri 09:15-15:30 IST (no DST).
// Pre-open call is 09:00-09:15. Post-close session 15:40-16:00 (we don't
// model that — for our purposes "closed" is good enough after 15:30).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

type SessionState = 'preopen' | 'open' | 'closed';

interface MarketStatus {
  state: SessionState;
  /** Short label suitable for a ticker chip. */
  label: string;
  /** Longer relative description (e.g. "opens in 9h 12m" / "closes in 2h"). */
  detail: string;
  isWeekend: boolean;
}

const minutesFromMidnight = (h: number, m: number) => h * 60 + m;

const OPEN_MIN = minutesFromMidnight(9, 15);
const CLOSE_MIN = minutesFromMidnight(15, 30);
const PREOPEN_MIN = minutesFromMidnight(9, 0);

const istNow = () => {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
};

const fmtDelta = (mins: number) => {
  if (mins < 1) return 'soon';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/**
 * Minutes from the IST `now` until the next market open. Handles same-day,
 * next-day, and weekend rollovers.
 */
const minutesToNextOpen = (ist: Date): number => {
  const dow = ist.getUTCDay(); // 0=Sun in IST (we shifted)
  const min = ist.getUTCHours() * 60 + ist.getUTCMinutes();

  if (dow >= 1 && dow <= 5 && min < OPEN_MIN) {
    return OPEN_MIN - min;
  }

  // Otherwise advance day by day to the next weekday's open.
  let extraDays = 1;
  let probeDow = (dow + 1) % 7;
  while (probeDow === 0 || probeDow === 6) {
    extraDays += 1;
    probeDow = (probeDow + 1) % 7;
  }
  const minsLeftToday = 24 * 60 - min;
  return minsLeftToday + (extraDays - 1) * 24 * 60 + OPEN_MIN;
};

export const marketStatus = (): MarketStatus => {
  const ist = istNow();
  const dow = ist.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  const min = ist.getUTCHours() * 60 + ist.getUTCMinutes();

  if (!isWeekend && min >= OPEN_MIN && min < CLOSE_MIN) {
    return {
      state: 'open',
      label: 'Live',
      detail: `closes in ${fmtDelta(CLOSE_MIN - min)}`,
      isWeekend: false,
    };
  }

  if (!isWeekend && min >= PREOPEN_MIN && min < OPEN_MIN) {
    return {
      state: 'preopen',
      label: 'Pre-open',
      detail: `opens in ${fmtDelta(OPEN_MIN - min)}`,
      isWeekend: false,
    };
  }

  return {
    state: 'closed',
    label: 'Closed',
    detail: `opens in ${fmtDelta(minutesToNextOpen(ist))}`,
    isWeekend,
  };
};
