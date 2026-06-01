import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AnalyticsSectionLabel,
  BrokerageBreakdownCard,
  EquityCurveCard,
  HoldTimeCard,
  HourHeatmapCard,
  WeekdayBarCard,
} from '../components/AnalyticsCards';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { useAuth } from '../auth/AuthProvider';
import {
  useAnalyticsQuery,
  useCostsQuery,
  useIdentityQuery,
  useMoodCorrelationQuery,
} from '../hooks/useFeatures';
import { useWeeklyReportQuery } from '../hooks/useToday';
import type { RootStackParamList } from '../navigation/types';
import type { AggregateStats } from '../types';
import { formatInr, formatInrPlain } from '../utils/currency';
import { colors, radius, spacing } from '../utils/theme';

export const InsightsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { aiEnabled, aiPro } = useAuth();
  const { data, isLoading, refetch, isFetching } = useWeeklyReportQuery();
  // Identity report is Pro-only (free cap = 0). Skip the query for free /
  // Lite users so we don't fire a 402.
  const identity = useIdentityQuery({ enabled: aiPro });
  const costs = useCostsQuery();
  const analytics = useAnalyticsQuery();
  const moodCorr = useMoodCorrelationQuery();

  const topSymbols = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.bySymbol)
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl))
      .slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const stats = data?.stats;
  const hasData = !!stats && stats.count > 0;

  return (
    <View style={styles.root}>
      <View style={styles.canvas} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* STICKY HEADER */}
        <View style={styles.stickyHeader}>
          <Text style={styles.kicker}>This week</Text>
          <Text style={styles.title}>Pattern report</Text>
          {data ? (
            <Text style={styles.subtitle}>
              {data.range.start}  →  {data.range.end}
            </Text>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        >
          {!hasData ? (
            <WalletCard skin={skins.violet} accent={accents.accent}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bar-chart" size={22} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No trades this week</Text>
              <Text style={styles.emptyText}>
                Sync from Kite after you trade. Weekly patterns require at least
                a handful of round trips to be meaningful.
              </Text>
            </WalletCard>
          ) : (
            <>
              {/* Top-line P&L card — the "balance card" for the week. */}
              <WalletCard
                skin={skins.navy}
                accent={
                  stats!.totalPnl > 0
                    ? accents.success
                    : stats!.totalPnl < 0
                      ? accents.danger
                      : accents.neutral
                }
                elevated
                style={{ marginBottom: PAGE_GAP }}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardKicker}>Week net</Text>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {stats!.count} TRADE{stats!.count === 1 ? '' : 'S'}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroRow}>
                  <Text
                    style={[
                      styles.heroValue,
                      {
                        color:
                          stats!.totalPnl > 0
                            ? colors.success
                            : stats!.totalPnl < 0
                              ? colors.danger
                              : colors.text,
                      },
                    ]}
                  >
                    {formatInr(stats!.totalPnl)}
                  </Text>
                </View>
                <View style={styles.cardFooterRow}>
                  <FootStat
                    label="Win rate"
                    value={`${stats!.winRate.toFixed(0)}%`}
                  />
                  <View style={styles.footDivider} />
                  <FootStat
                    label="W / L"
                    value={`${stats!.wins} / ${stats!.losses}`}
                  />
                  <View style={styles.footDivider} />
                  <FootStat
                    label="Avg win"
                    value={formatInrPlain(stats!.avgWin)}
                  />
                </View>
              </WalletCard>

              {identity.data?.report ? (
                <>
                  <SectionLabel>Who you are</SectionLabel>
                  <WalletCard skin={skins.violet} accent={accents.accent} elevated>
                    <Text style={styles.archetype}>
                      {identity.data.report.archetype}
                    </Text>
                    <Text style={styles.identityEdge}>
                      {identity.data.report.edge}
                    </Text>
                    {identity.data.report.worstHabit ? (
                      <Text style={styles.identityWarn}>
                        {identity.data.report.worstHabit}
                      </Text>
                    ) : null}
                    <View style={styles.identityChange}>
                      <Text style={styles.identityChangeLabel}>One change</Text>
                      <Text style={styles.identityChangeText}>
                        {identity.data.report.oneChange}
                      </Text>
                    </View>
                  </WalletCard>
                </>
              ) : null}

              {costs.data?.last30Days && costs.data.last30Days.trades > 0 ? (
                <>
                  <SectionLabel>Cost drag (30d)</SectionLabel>
                  <WalletCard skin={skins.navy} accent={accents.warning} elevated>
                    <View style={styles.costTopRow}>
                      <View style={styles.costIconBadge}>
                        <Ionicons
                          name="receipt-outline"
                          size={15}
                          color={colors.warning}
                        />
                      </View>
                      <Text style={styles.costKicker}>Fees · last 30 days</Text>
                    </View>
                    <Text style={styles.costHero}>
                      {formatInrPlain(costs.data.last30Days.estimatedCosts)}
                    </Text>

                    {/* Visual drag bar: % of gross consumed by costs. */}
                    <View style={styles.costBarTrack}>
                      <View
                        style={[
                          styles.costBarFill,
                          {
                            width: `${Math.min(100, costs.data.last30Days.costDragPct)}%` as `${number}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.costMetricsRow}>
                      <View style={styles.costMetric}>
                        <Text style={styles.costMetricLabel}>Gross</Text>
                        <Text style={styles.costMetricValue}>
                          {formatInr(costs.data.last30Days.grossPnl)}
                        </Text>
                      </View>
                      <View style={styles.costMetricDivider} />
                      <View style={styles.costMetric}>
                        <Text style={styles.costMetricLabel}>Net</Text>
                        <Text style={styles.costMetricValue}>
                          {formatInr(costs.data.last30Days.netPnl)}
                        </Text>
                      </View>
                      <View style={styles.costMetricDivider} />
                      <View style={styles.costMetric}>
                        <Text style={styles.costMetricLabel}>Drag</Text>
                        <Text
                          style={[
                            styles.costMetricValue,
                            { color: colors.warning },
                          ]}
                        >
                          {costs.data.last30Days.costDragPct.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  </WalletCard>
                </>
              ) : null}

              {/* ---- Tier-A free analytics (90-day window) -------- */}
              {analytics.data && analytics.data.trades >= 2 ? (
                <>
                  <AnalyticsSectionLabel icon="trending-up-outline">
                    Equity curve
                  </AnalyticsSectionLabel>
                  <EquityCurveCard
                    equity={analytics.data.equity}
                    peakDrawdown={analytics.data.peakDrawdown}
                    rangeDays={analytics.data.rangeDays}
                  />

                  <AnalyticsSectionLabel icon="time-outline">
                    When you make money
                  </AnalyticsSectionLabel>
                  <HourHeatmapCard buckets={analytics.data.byHour} />

                  <AnalyticsSectionLabel icon="calendar-outline">
                    Your week
                  </AnalyticsSectionLabel>
                  <WeekdayBarCard buckets={analytics.data.byWeekday} />

                  <AnalyticsSectionLabel icon="hourglass-outline">
                    Hold time
                  </AnalyticsSectionLabel>
                  <HoldTimeCard stats={analytics.data.holdTime} />

                  {analytics.data.costs.breakdown.total > 0 ? (
                    <>
                      <AnalyticsSectionLabel icon="pie-chart-outline">
                        Cost breakdown
                      </AnalyticsSectionLabel>
                      <BrokerageBreakdownCard
                        breakdown={analytics.data.costs.breakdown}
                      />
                    </>
                  ) : null}
                </>
              ) : null}

              {moodCorr.data && moodCorr.data.checkins >= 3 ? (
                <>
                  <SectionLabel>Mood × P&amp;L</SectionLabel>
                  <WalletCard skin={skins.navy} accent={accents.neutral}>
                    {moodCorr.data.sleep
                      .filter((b) => b.days > 0)
                      .map((b) => (
                        <View key={b.label} style={styles.moodRow}>
                          <Text style={styles.moodLabel}>{b.label} sleep</Text>
                          <Text style={styles.moodVal}>
                            {b.days}d · avg {formatInr(b.avgPnl)}
                          </Text>
                        </View>
                      ))}
                  </WalletCard>
                </>
              ) : null}

              <View style={{ marginTop: PAGE_GAP, marginBottom: PAGE_GAP }}>
                <WalletCard
                  skin={skins.violet}
                  accent={accents.accent}
                  elevated
                  onPress={() => navigation.navigate('Playbook')}
                >
                  <View style={styles.linkRow}>
                    <View style={styles.linkIconBadge}>
                      <Ionicons name="book" size={18} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkTitle}>Personal playbook</Text>
                      <Text style={styles.linkSub}>
                        Your tagged setups — winners vs leaks
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                </WalletCard>
              </View>

              {/* Drawdown / avg loss / runup card. */}
              <SectionLabel>Risk this week</SectionLabel>
              <WalletCard skin={skins.navy} accent={accents.neutral}>
                <View style={styles.gridRow}>
                  <GridCell
                    label="Max DD"
                    value={formatInrPlain(data!.maxDrawdown)}
                    tone="danger"
                  />
                  <View style={styles.gridDivV} />
                  <GridCell
                    label="Max runup"
                    value={formatInrPlain(data!.maxRunup)}
                    tone="success"
                  />
                </View>
                <View style={styles.gridDivH} />
                <View style={styles.gridRow}>
                  <GridCell
                    label="Avg loss"
                    value={formatInrPlain(stats!.avgLoss)}
                    tone="danger"
                  />
                  <View style={styles.gridDivV} />
                  <GridCell
                    label="Avg win"
                    value={formatInrPlain(stats!.avgWin)}
                    tone="success"
                  />
                </View>
              </WalletCard>

              {/* AI narrative card. */}
              {data!.narrative ? (
                <>
                  <SectionLabel>Coach&apos;s read</SectionLabel>
                  <WalletCard skin={skins.violet} accent={accents.accent}>
                    <View style={styles.narrativeHeader}>
                      <View style={styles.narrativeIcon}>
                        <Ionicons name="sparkles" size={14} color={colors.accent} />
                      </View>
                      <Text style={styles.narrativeKicker}>Pattern of the week</Text>
                    </View>
                    <Text style={styles.narrativeText}>{data!.narrative}</Text>
                  </WalletCard>
                </>
              ) : !aiEnabled || !aiPro || data!.coachConfigured ? null : (
                <WalletCard
                  skin={skins.warning}
                  accent={accents.warning}
                  style={{ marginTop: spacing.lg }}
                >
                  <Text style={styles.note}>
                    Set{' '}
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      OPENAI_API_KEY
                    </Text>{' '}
                    in tradecoach-server/.env to unlock the AI narrative for
                    weekly reports.
                  </Text>
                </WalletCard>
              )}

              {/* Bucket breakdowns. */}
              <BucketCard
                title="P&L by emotion"
                icon="happy-outline"
                buckets={data!.byEmotion}
                emptyHint="Tag emotions on trades to unlock this"
              />
              <BucketCard
                title="P&L by setup"
                icon="grid-outline"
                buckets={data!.bySetup}
                emptyHint="Tag setups on trades to unlock this"
              />
              <BucketCard
                title="Long vs short"
                icon="swap-horizontal-outline"
                buckets={data!.bySide}
              />

              {/* Top symbols list. */}
              {topSymbols.length > 0 ? (
                <>
                  <SectionLabel icon="podium-outline">
                    Top symbols by impact
                  </SectionLabel>
                  <WalletCard
                    skin={skins.navy}
                    accent={accents.neutral}
                    padded={false}
                  >
                    {topSymbols.map((s, idx) => {
                      const positive = s.totalPnl >= 0;
                      const last = idx === topSymbols.length - 1;
                      return (
                        <View
                          key={s.key}
                          style={[
                            styles.symbolRow,
                            !last && {
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: 'rgba(255,255,255,0.06)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.rowDot,
                              {
                                backgroundColor: positive
                                  ? colors.success
                                  : colors.danger,
                              },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.symbolName} numberOfLines={1}>
                              {s.key}
                            </Text>
                            <Text style={styles.symbolMeta}>
                              {s.count} trade{s.count === 1 ? '' : 's'} ·{' '}
                              {s.winRate.toFixed(0)}% win
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.symbolPnl,
                              {
                                color: positive ? colors.success : colors.danger,
                              },
                            ]}
                          >
                            {formatInr(s.totalPnl)}
                          </Text>
                        </View>
                      );
                    })}
                  </WalletCard>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const PAGE_GAP = 12;

// ---------------------------------------------------------------------------

const SectionLabel = ({
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

const FootStat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.footStat}>
    <Text style={styles.footStatLabel}>{label}</Text>
    <Text style={styles.footStatValue}>{value}</Text>
  </View>
);

const GridCell = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) => {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : colors.text;
  return (
    <View style={styles.gridCell}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={[styles.gridValue, { color }]}>{value}</Text>
    </View>
  );
};

const BucketCard = ({
  title,
  icon,
  buckets,
  emptyHint,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  buckets: Record<string, AggregateStats>;
  emptyHint?: string;
}) => {
  const entries = Object.entries(buckets)
    .filter(([k]) => k !== 'untagged' || Object.keys(buckets).length === 1)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl));

  const max = entries.length
    ? Math.max(...entries.map((b) => Math.abs(b.totalPnl)))
    : 1;

  return (
    <>
      <SectionLabel icon={icon}>{title}</SectionLabel>
      <WalletCard skin={skins.navy} accent={accents.neutral}>
        {entries.length === 0 && emptyHint ? (
          <Text style={styles.note}>{emptyHint}</Text>
        ) : (
          entries.map((b, idx) => {
            const positive = b.totalPnl >= 0;
            const widthPct = Math.max(6, (Math.abs(b.totalPnl) / max) * 100);
            const last = idx === entries.length - 1;
            return (
              <View
                key={b.key}
                style={[styles.bucketRow, !last && { marginBottom: 14 }]}
              >
                <View style={styles.bucketHeader}>
                  <View style={styles.bucketKeyRow}>
                    <Text style={styles.bucketKey}>{b.key}</Text>
                    <Text style={styles.bucketMeta}>
                      {b.count} · {b.winRate.toFixed(0)}%
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.bucketPnl,
                      { color: positive ? colors.success : colors.danger },
                    ]}
                  >
                    {formatInr(b.totalPnl)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={
                      positive
                        ? (['#10B981', '#34D399'] as [string, string])
                        : (['#DC2626', '#F87171'] as [string, string])
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${widthPct}%` }]}
                  />
                </View>
              </View>
            );
          })
        )}
      </WalletCard>
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06081A' },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#06081A',
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    // Generous breathing room above the first card so the kicker/chip
    // at the top of the WalletCard aren't immediately scrolled under
    // the sticky header on tiny scroll deltas.
    paddingTop: spacing.xl,
  },

  // Sticky header
  stickyHeader: {
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: '#06081A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    // Low z-index so modals can overlay; high enough to sit over the scroll
    // content but not above presentation layers.
    zIndex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textDim,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },

  // Top card — week net
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.text,
  },
  heroRow: { marginTop: 14 },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
    lineHeight: 46,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    gap: spacing.md,
  },
  footStat: { flex: 1 },
  footStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  footStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  footDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section label
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

  // Risk grid
  gridRow: { flexDirection: 'row' },
  gridCell: { flex: 1, paddingVertical: 6 },
  gridLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  gridValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  gridDivV: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
  },
  gridDivH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.sm + 2,
  },

  // Narrative
  narrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  narrativeIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrativeKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  narrativeText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    fontWeight: '500',
    letterSpacing: -0.05,
  },
  archetype: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  identityEdge: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 10,
  },
  identityWarn: {
    fontSize: 14,
    color: colors.warning,
    lineHeight: 20,
    marginBottom: 10,
  },
  identityChange: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 10,
  },
  identityChangeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  identityChangeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 20,
  },
  // Cost drag card — receipt icon → big fee number → drag bar → metrics row
  costTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  costIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
  },
  costKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  costHero: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.8,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
  costBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 14,
  },
  costBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  costMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  costMetric: { flex: 1 },
  costMetricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: spacing.sm,
  },
  costMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  costMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  moodLabel: { color: colors.textDim, fontSize: 13 },
  moodVal: { color: '#fff', fontWeight: '600', fontSize: 13 },
  // Link card (playbook) — icon badge + title/sub stack + chevron
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  linkIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(183,148,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(183,148,255,0.28)',
  },
  linkTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  linkSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  note: {
    fontSize: 14,
    color: colors.textDim,
    lineHeight: 21,
  },

  // Bucket rows
  bucketRow: {},
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bucketKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  bucketKey: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
    letterSpacing: -0.1,
  },
  bucketMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  bucketPnl: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill },

  // Symbol rows
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg + 4,
  },
  rowDot: { width: 6, height: 6, borderRadius: 3, alignSelf: 'center' },
  symbolName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  symbolMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  symbolPnl: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },

  // Empty state
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  emptyText: {
    color: colors.textDim,
    marginTop: 6,
    lineHeight: 21,
    fontSize: 14,
  },
});

export default InsightsScreen;
