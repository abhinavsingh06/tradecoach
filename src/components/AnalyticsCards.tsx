// Pattern-analytics cards for the Insights screen. All five render server
// data from GET /coach/analytics. Each card has its own visual identity but
// shares the WalletCard shell + uppercase kicker pattern so they read as a
// coherent set.
//
// Pure-View visualisations (no SVG dependency) so the bundle stays light:
//   - EquityCurveCard: bar-style equity sparkline + drawdown band underlay
//   - HourHeatmapCard: 10-bucket strip (9..15 IST), height + colour
//   - WeekdayBarCard:  5-bucket strip (Mon..Fri), height + colour
//   - HoldTimeCard:    two stat tiles + delta verdict
//   - BrokerageBreakdownCard: stacked horizontal bar + legend

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { WalletCard, accents, skins } from './WalletCard';
import type {
  AnalyticsReport,
  CostBreakdown,
  EquityPoint,
  HourBucket,
  WeekdayBucket,
} from '../types';
import { formatInr, formatInrPlain } from '../utils/currency';
import { colors, spacing } from '../utils/theme';

// ---------------------------------------------------------------------------
// Section label — matches Insights pattern. Exported so the screen can lay
// out its own labels above each card.
// ---------------------------------------------------------------------------

export const AnalyticsSectionLabel = ({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.sectionHead}>
    {icon ? <Ionicons name={icon} size={12} color={colors.textDim} /> : null}
    <Text style={styles.sectionLabel}>{children}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// 1. Equity curve + drawdown band
// Bars from the bottom = cumulative P&L. Underlay band = drawdown
// (peak-so-far minus current), filled with a faint amber.
// ---------------------------------------------------------------------------

interface EquityProps {
  equity: EquityPoint[];
  peakDrawdown: number;
  rangeDays: number;
}

export const EquityCurveCard = ({
  equity,
  peakDrawdown,
  rangeDays,
}: EquityProps) => {
  if (equity.length < 2) return null;

  const totalPnl = equity[equity.length - 1]!.pnl;
  const minPnl = Math.min(0, ...equity.map((p) => p.pnl));
  const maxPnl = Math.max(0, ...equity.map((p) => p.pnl));
  const range = Math.max(1, maxPnl - minPnl);

  // Pre-compute heights in 0..1 (relative to chart height) and a fill
  // direction (above-zero = green, below-zero = red).
  const points = equity.map((p) => {
    const norm = (p.pnl - minPnl) / range;
    return { norm, positive: p.pnl >= 0, pnl: p.pnl };
  });
  const zeroLine = (0 - minPnl) / range;

  return (
    <WalletCard
      skin={totalPnl >= 0 ? skins.navy : skins.danger}
      accent={totalPnl >= 0 ? accents.success : accents.danger}
      elevated
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor:
                totalPnl >= 0
                  ? 'rgba(52,211,153,0.16)'
                  : 'rgba(248,113,113,0.16)',
              borderColor:
                totalPnl >= 0
                  ? 'rgba(52,211,153,0.28)'
                  : 'rgba(248,113,113,0.28)',
            },
          ]}
        >
          <Ionicons
            name="trending-up-outline"
            size={15}
            color={totalPnl >= 0 ? colors.success : colors.danger}
          />
        </View>
        <Text style={styles.kicker}>Equity · last {rangeDays}d</Text>
      </View>

      <Text
        style={[
          styles.hero,
          { color: totalPnl >= 0 ? colors.success : colors.danger },
        ]}
      >
        {formatInr(totalPnl)}
      </Text>

      {/* Chart — fixed height, bars equally-distributed across the width */}
      <View style={styles.chart}>
        {/* Zero baseline */}
        <View style={[styles.zeroLine, { top: `${(1 - zeroLine) * 100}%` }]} />
        <View style={styles.barsRow}>
          {points.map((pt, i) => {
            const heightPct = Math.abs(pt.norm - zeroLine) * 100;
            const fromZero = pt.positive ? 1 - zeroLine : zeroLine;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: `${heightPct}%`,
                    [pt.positive ? 'bottom' : 'top']: `${fromZero * 100}%`,
                    backgroundColor: pt.positive
                      ? 'rgba(52,211,153,0.55)'
                      : 'rgba(248,113,113,0.55)',
                  } as never,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.equityFooter}>
        <View style={styles.footPair}>
          <Text style={styles.footLabel}>Max drawdown</Text>
          <Text style={[styles.footValue, { color: colors.warning }]}>
            {formatInrPlain(peakDrawdown)}
          </Text>
        </View>
        <View style={styles.footPair}>
          <Text style={styles.footLabel}>Trades</Text>
          <Text style={styles.footValue}>{equity.length}</Text>
        </View>
      </View>
    </WalletCard>
  );
};

// ---------------------------------------------------------------------------
// 2. Hour-of-day heatmap (Indian markets are 9:15–15:30 IST → hours 9..15)
// Each cell: height = trade count (relative), colour = P&L sign + intensity.
// ---------------------------------------------------------------------------

interface HourProps {
  buckets: HourBucket[];
}

const HOURS = [9, 10, 11, 12, 13, 14, 15];

export const HourHeatmapCard = ({ buckets }: HourProps) => {
  if (buckets.length === 0) return null;
  const byHour = new Map(buckets.map((b) => [b.hour, b]));
  const maxTrades = Math.max(...buckets.map((b) => b.trades), 1);
  const maxAbsPnl = Math.max(...buckets.map((b) => Math.abs(b.pnl)), 1);

  // Best/worst hour for the verdict line.
  const sorted = [...buckets].sort((a, b) => b.pnl - a.pnl);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;

  return (
    <WalletCard skin={skins.navy} accent={accents.accent}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'rgba(183,148,255,0.16)',
              borderColor: 'rgba(183,148,255,0.28)',
            },
          ]}
        >
          <Ionicons name="time-outline" size={15} color={colors.accent} />
        </View>
        <Text style={styles.kicker}>P&amp;L by hour · IST</Text>
      </View>

      <View style={styles.hourGrid}>
        {HOURS.map((h) => {
          const b = byHour.get(h);
          const trades = b?.trades ?? 0;
          const pnl = b?.pnl ?? 0;
          const heightPct = trades ? 12 + (trades / maxTrades) * 88 : 8;
          const intensity = Math.abs(pnl) / maxAbsPnl;
          const color = !trades
            ? 'rgba(255,255,255,0.06)'
            : pnl >= 0
              ? `rgba(52,211,153,${0.35 + intensity * 0.55})`
              : `rgba(248,113,113,${0.35 + intensity * 0.55})`;
          return (
            <View key={h} style={styles.hourCol}>
              <View style={styles.hourBarTrack}>
                <View
                  style={[
                    styles.hourBar,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.hourLabel}>
                {h.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.verdictLine}>
        Best: <Text style={styles.verdictGood}>
          {String(best.hour).padStart(2, '0')}:00 · {formatInr(best.pnl)}
        </Text>{' '}
        · Worst:{' '}
        <Text style={styles.verdictBad}>
          {String(worst.hour).padStart(2, '0')}:00 · {formatInr(worst.pnl)}
        </Text>
      </Text>
    </WalletCard>
  );
};

// ---------------------------------------------------------------------------
// 3. Day-of-week breakdown
// ---------------------------------------------------------------------------

interface WeekdayProps {
  buckets: WeekdayBucket[];
}

export const WeekdayBarCard = ({ buckets }: WeekdayProps) => {
  if (buckets.every((b) => b.trades === 0)) return null;
  const maxAbsPnl = Math.max(...buckets.map((b) => Math.abs(b.pnl)), 1);

  return (
    <WalletCard skin={skins.navy} accent={accents.neutral}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.16)',
            },
          ]}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.text} />
        </View>
        <Text style={styles.kicker}>By weekday</Text>
      </View>

      <View style={styles.weekdayCol}>
        {buckets.map((b) => {
          const widthPct = b.trades
            ? Math.max(4, (Math.abs(b.pnl) / maxAbsPnl) * 100)
            : 4;
          const positive = b.pnl >= 0;
          return (
            <View key={b.weekday} style={styles.weekdayRow}>
              <Text style={styles.weekdayLabel}>{b.label}</Text>
              <View style={styles.weekdayTrack}>
                <View
                  style={[
                    styles.weekdayFill,
                    {
                      width: `${widthPct}%`,
                      backgroundColor: !b.trades
                        ? 'rgba(255,255,255,0.10)'
                        : positive
                          ? 'rgba(52,211,153,0.55)'
                          : 'rgba(248,113,113,0.55)',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.weekdayPnl,
                  {
                    color: !b.trades
                      ? colors.textMuted
                      : positive
                        ? colors.success
                        : colors.danger,
                  },
                ]}
              >
                {b.trades ? formatInr(b.pnl) : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </WalletCard>
  );
};

// ---------------------------------------------------------------------------
// 4. Hold-time analysis — winners vs losers, with bagholder warning
// ---------------------------------------------------------------------------

interface HoldTimeProps {
  stats: AnalyticsReport['holdTime'];
}

const formatMinutes = (m: number): string => {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

export const HoldTimeCard = ({ stats }: HoldTimeProps) => {
  if (stats.winnerCount + stats.loserCount === 0) return null;

  return (
    <WalletCard
      skin={skins.navy}
      accent={stats.bagholderRisk ? accents.danger : accents.neutral}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: stats.bagholderRisk
                ? 'rgba(248,113,113,0.16)'
                : 'rgba(255,255,255,0.08)',
              borderColor: stats.bagholderRisk
                ? 'rgba(248,113,113,0.28)'
                : 'rgba(255,255,255,0.16)',
            },
          ]}
        >
          <Ionicons
            name="hourglass-outline"
            size={15}
            color={stats.bagholderRisk ? colors.danger : colors.text}
          />
        </View>
        <Text style={styles.kicker}>Hold-time discipline</Text>
      </View>

      <View style={styles.holdGrid}>
        <View style={styles.holdCell}>
          <Text style={styles.holdLabel}>Winners</Text>
          <Text style={[styles.holdValue, { color: colors.success }]}>
            {formatMinutes(stats.winnerAvgMinutes)}
          </Text>
          <Text style={styles.holdSub}>avg, {stats.winnerCount} trades</Text>
        </View>
        <View style={styles.holdDivider} />
        <View style={styles.holdCell}>
          <Text style={styles.holdLabel}>Losers</Text>
          <Text style={[styles.holdValue, { color: colors.danger }]}>
            {formatMinutes(stats.loserAvgMinutes)}
          </Text>
          <Text style={styles.holdSub}>avg, {stats.loserCount} trades</Text>
        </View>
      </View>

      <Text style={[styles.verdictLine, { marginTop: spacing.md }]}>
        {stats.bagholderRisk ? (
          <>
            <Text style={styles.verdictBad}>Bagholder risk:</Text> you're
            holding losers {(stats.loserAvgMinutes / Math.max(1, stats.winnerAvgMinutes)).toFixed(1)}× longer than winners.
          </>
        ) : stats.winnerAvgMinutes && stats.loserAvgMinutes ? (
          <>
            <Text style={styles.verdictGood}>Healthy.</Text> You're cutting
            losers in line with how long you let winners run.
          </>
        ) : (
          'Need a few more closed trades to assess hold-time discipline.'
        )}
      </Text>
    </WalletCard>
  );
};

// ---------------------------------------------------------------------------
// 5. Brokerage breakdown — stacked horizontal bar showing where each ₹ goes
// ---------------------------------------------------------------------------

interface BrokerageProps {
  breakdown: CostBreakdown;
}

interface Slice {
  key: keyof Omit<CostBreakdown, 'total'>;
  label: string;
  color: string;
}

const SLICES: Slice[] = [
  { key: 'brokerage', label: 'Brokerage', color: '#7c5cff' },
  { key: 'stt', label: 'STT', color: '#f87171' },
  { key: 'gst', label: 'GST', color: '#fbbf24' },
  { key: 'exchangeTxnCharges', label: 'Exchange', color: '#22d3ee' },
  { key: 'sebiCharges', label: 'SEBI', color: '#a3e635' },
  { key: 'stampDuty', label: 'Stamp', color: '#fb7185' },
];

export const BrokerageBreakdownCard = ({ breakdown }: BrokerageProps) => {
  if (breakdown.total <= 0) return null;
  const total = breakdown.total;

  return (
    <WalletCard skin={skins.navy} accent={accents.warning}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'rgba(251,191,36,0.16)',
              borderColor: 'rgba(251,191,36,0.28)',
            },
          ]}
        >
          <Ionicons name="pie-chart-outline" size={15} color={colors.warning} />
        </View>
        <Text style={styles.kicker}>Where your fees go</Text>
      </View>

      {/* Stacked horizontal bar */}
      <View style={styles.stackBar}>
        {SLICES.map((s, i) => {
          const amount = breakdown[s.key];
          if (amount <= 0) return null;
          const widthPct = (amount / total) * 100;
          return (
            <View
              key={s.key}
              style={{
                width: `${widthPct}%`,
                height: '100%',
                backgroundColor: s.color,
                // Soft seam between segments.
                marginLeft: i === 0 ? 0 : 1,
              }}
            />
          );
        })}
      </View>

      {/* Legend grid */}
      <View style={styles.legendGrid}>
        {SLICES.map((s) => {
          const amount = breakdown[s.key];
          if (amount <= 0) return null;
          const pct = ((amount / total) * 100).toFixed(0);
          return (
            <View key={s.key} style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: s.color }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendLabel}>{s.label}</Text>
                <Text style={styles.legendValue}>
                  {formatInrPlain(amount)} · {pct}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </WalletCard>
  );
};

// ---------------------------------------------------------------------------
// Styles — shared between all five cards so spacing/typography stay aligned
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg + 2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textDim,
    textTransform: 'uppercase',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  hero: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  verdictLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
    marginTop: 14,
  },
  verdictGood: { color: colors.success, fontWeight: '700' },
  verdictBad: { color: colors.danger, fontWeight: '700' },

  // Equity curve
  chart: {
    marginTop: 14,
    height: 90,
    position: 'relative',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 1,
  },
  bar: {
    flex: 1,
    minHeight: 1,
    borderRadius: 1,
    position: 'absolute',
  },
  equityFooter: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    gap: spacing.lg,
  },
  footPair: { flex: 1 },
  footLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  footValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },

  // Hour heatmap
  hourGrid: {
    flexDirection: 'row',
    height: 110,
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  hourCol: { flex: 1, alignItems: 'center' },
  hourBarTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  hourBar: { width: '100%', borderRadius: 6 },
  hourLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 6,
    letterSpacing: 0.4,
  },

  // Weekday rows
  weekdayCol: { gap: 8, marginTop: 4 },
  weekdayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekdayLabel: {
    width: 36,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  weekdayTrack: {
    flex: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 7,
    overflow: 'hidden',
  },
  weekdayFill: { height: '100%', borderRadius: 7 },
  weekdayPnl: {
    width: 84,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Hold time
  holdGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  holdCell: { flex: 1 },
  holdDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: spacing.md,
  },
  holdLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  holdValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  holdSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Brokerage stack
  stackBar: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 4,
  },
  legendGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  legendItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  legendValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
