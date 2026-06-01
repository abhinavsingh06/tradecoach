export type TradeSide = 'long' | 'short';

export type Emotion =
  | 'calm'
  | 'confident'
  | 'fomo'
  | 'fearful'
  | 'greedy'
  | 'revenge'
  | 'tilted'
  | 'patient';

export const EMOTIONS: Emotion[] = [
  'calm',
  'confident',
  'patient',
  'fomo',
  'fearful',
  'greedy',
  'revenge',
  'tilted',
];

export const SETUPS = [
  'Breakout',
  'Pullback',
  'Reversal',
  'Range',
  'Trend Continuation',
  'News',
  'Earnings',
  'Other',
] as const;

export type Setup = (typeof SETUPS)[number];

export interface AiDraft {
  emotion: string | null;
  setup: string | null;
  notes: string | null;
  rationale: string | null;
  model?: string;
  generatedAt: string;
}

/** Closed round trip synced from Kite via the backend. */
export interface Trade {
  id: string;
  tradingsymbol: string;
  exchange: string;
  product: string;
  side: TradeSide;
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  openedAt: string;
  closedAt: string;
  grossPnl: number;
  journal: {
    emotion: string | null;
    setup: string | null;
    notes: string | null;
    updatedAt: string;
    aiDraft?: AiDraft | null;
    aiDraftAcceptedAt?: string | null;
  } | null;
}

export interface SimilarTrade {
  id: string;
  tradingsymbol: string;
  side: TradeSide;
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  closedAt: string;
  grossPnl: number;
  product: string;
  journal?: {
    emotion?: string | null;
    setup?: string | null;
    notes?: string | null;
  } | null;
  score: number;
}

export interface AggregateStats {
  count: number;
  totalPnl: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  bestPnl: number;
  worstPnl: number;
  rr: number;
}

export interface SymbolStats {
  symbol: string;
  overall: AggregateStats;
  longs: AggregateStats;
  shorts: AggregateStats;
  lastClosedAt: number | null;
}

export interface TradingPlan {
  id: string;
  tradingDate: string;
  intention: string | null;
  maxLossRupees: number | null;
  maxTrades: number | null;
  plannedSetups: string[];
  stopRule: string | null;
}

export interface DailyReview {
  tradingDate: string;
  summary: string;
  bestDecision: string | null;
  worstDecision: string | null;
  nextStep: string | null;
  grade: string | null;
  planAdherence: number | null;
  metrics?: {
    tradeCount: number;
    grossPnl: number;
    winRate: number;
    maxRunup: number;
    maxDrawdown: number;
  } | null;
}

export interface CoachEvent {
  id: string;
  kind: string;
  severity: 'info' | 'warn' | 'alert';
  message: string;
  createdAt: string;
}

export interface TiltSignal {
  score: number;
  tilted: boolean;
  lastLossAt: string | null;
  consecutiveLosses: number;
  avgDurationMinutes: number;
}

export interface OvertradingSignal {
  today: number;
  median: number;
  level: 'calm' | 'busy' | 'high' | 'extreme';
  ratio: number;
}

export interface TodaySnapshot {
  today: string;
  stats: {
    tradeCount: number;
    grossPnl: number;
    winRate: number;
    wins: number;
    losses: number;
  };
  tilt: TiltSignal;
  overtrading: OvertradingSignal;
  plan: TradingPlan | null;
  review: DailyReview | null;
  events: CoachEvent[];
  coachConfigured: boolean;
}

export interface WeeklyReport {
  range: { start: string; end: string };
  stats: AggregateStats;
  byEmotion: Record<string, AggregateStats>;
  bySetup: Record<string, AggregateStats>;
  bySide: Record<string, AggregateStats>;
  bySymbol: Record<string, AggregateStats>;
  maxRunup: number;
  maxDrawdown: number;
  narrative: string | null;
  coachConfigured: boolean;
}

export interface OpenPosition {
  id: string;
  tradingsymbol: string;
  exchange: string;
  product: string;
  side: TradeSide;
  quantity: number;
  avgEntryPrice: number;
  openedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface AuthUser {
  id: string;
  name: string;
  shortname: string | null;
  email: string | null;
  avatarUrl: string | null;
  broker: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'trial';

export interface Entitlement {
  tier: SubscriptionTier;
  pro: boolean;
  validUntil: string | null;
  source: string;
}

export interface QuotaBucket {
  bucket: string;
  description: string;
  cap: number;
  used: number;
}

export interface SubscriptionInfo {
  entitlement: Entitlement;
  day: string;
  buckets: QuotaBucket[];
  proPriceInr: number;
  trialDays: number;
  aiEnabled: boolean;
}

export const tradePnL = (t: Trade): number => t.grossPnl;

/** Legacy alias used by coach + insights. */
export const computePnL = tradePnL;

// --- Cost analyzer -----------------------------------------------------------
export interface CostBreakdown {
  brokerage: number;
  stt: number;
  exchangeTxnCharges: number;
  gst: number;
  sebiCharges: number;
  stampDuty: number;
  total: number;
}

export interface CostSummary {
  trades: number;
  grossPnl: number;
  estimatedCosts: number;
  netPnl: number;
  costDragPct: number;
  breakdown: CostBreakdown;
  costPerTrade: number;
}

export interface CostsReport {
  thisMonth: CostSummary;
  last30Days: CostSummary;
  lifetime: CostSummary;
  note: string;
}

// --- Pattern analytics (Tier-A free features) --------------------------------
export interface EquityPoint {
  /** ISO timestamp of when the round-trip closed. */
  at: string;
  /** Cumulative P&L through this trade. */
  pnl: number;
}

export interface DrawdownPoint {
  at: string;
  drawdown: number;
}

export interface HourBucket {
  /** IST hour, 9..15 typically. */
  hour: number;
  trades: number;
  pnl: number;
  wins: number;
}

export interface WeekdayBucket {
  label: string;
  weekday: number;
  trades: number;
  pnl: number;
  wins: number;
}

export interface HoldTimeStats {
  winnerAvgMinutes: number;
  loserAvgMinutes: number;
  winnerCount: number;
  loserCount: number;
  /** True if losers held >1.2× longer than winners. */
  bagholderRisk: boolean;
}

export interface AnalyticsReport {
  rangeDays: number;
  trades: number;
  equity: EquityPoint[];
  drawdown: DrawdownPoint[];
  peakDrawdown: number;
  byHour: HourBucket[];
  byWeekday: WeekdayBucket[];
  holdTime: HoldTimeStats;
  costs: CostSummary;
}

// --- Identity report ---------------------------------------------------------
export interface IdentityReport {
  archetype: string;
  edge: string;
  bestWindow: string | null;
  bestSetup: string | null;
  bestSymbol: string | null;
  worstHabit: string | null;
  oneChange: string;
  confidence: 'low' | 'medium' | 'high';
}

// --- Pre-trade gate ----------------------------------------------------------
export type GateVerdict = 'green' | 'yellow' | 'red';

export interface PreTradeGateResult {
  id: string;
  verdict: GateVerdict;
  message: string;
  signals: Record<string, unknown>;
  createdAt: string;
}

// --- Mood --------------------------------------------------------------------
export interface MoodCheckin {
  id: string;
  tradingDate: string;
  sleepHours: number | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
  note: string | null;
}

export interface MoodCorrelationBucket {
  label: string;
  days: number;
  pnl: number;
  avgPnl: number;
  winRate: number;
  trades: number;
}

// --- Voice memo --------------------------------------------------------------
export interface VoiceMemo {
  id: string;
  roundTripId: string | null;
  transcript: string | null;
  durationMs: number | null;
  status: 'recording' | 'transcribing' | 'ready' | 'failed';
  structured: {
    emotion: string | null;
    setup: string | null;
    notes: string | null;
  } | null;
  errorMessage: string | null;
  createdAt: string;
}

// --- Loss recovery -----------------------------------------------------------
export interface LossRecovery {
  id: string;
  tradingDate: string;
  triggerReason: string;
  triggerPnl: number | null;
  closedPositionsAt: string | null;
  writtenReflection: string | null;
  writtenReflectionAt: string | null;
  cooldownStartedAt: string | null;
  cooldownCompletedAt: string | null;
  tomorrowPlanSetAt: string | null;
  completedAt: string | null;
}

// --- Playbook ----------------------------------------------------------------
export interface PlaybookEntry {
  setup: string;
  count: number;
  totalPnl: number;
  winRate: number;
  score: number;
}

export interface PlaybookReport {
  winners: PlaybookEntry[];
  losers: PlaybookEntry[];
  totalTagged: number;
  totalTrades: number;
  untaggedCount: number;
}

// --- Tax ---------------------------------------------------------------------
export interface TaxReport {
  fy: string;
  fyStart: string;
  fyEnd: string;
  summary: {
    trades: number;
    turnover: number;
    grossPnl: number;
    estimatedCosts: number;
    netIncome: number;
  };
  splits: Record<
    string,
    { kind: string; trades: number; pnl: number; turnover?: number }
  >;
  note: string;
}
