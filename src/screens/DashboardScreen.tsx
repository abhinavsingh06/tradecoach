import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { Button } from '../components/Button';
import { CostDragCard } from '../components/CostDragCard';
import { LossRecoveryModal } from '../components/LossRecoveryModal';
import { MoodCheckinCard } from '../components/MoodCheckinCard';
import { Pill } from '../components/Pill';
import { PreTradeGateModal } from '../components/PreTradeGateModal';
import { PressableScale } from '../components/PressableScale';
import { Sparkline } from '../components/Sparkline';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { useActiveRecoveryQuery, useStreaksQuery } from '../hooks/useFeatures';
import {
  usePositionsQuery,
  useSyncTrades,
  useTradesQuery,
} from '../hooks/useTrades';
import {
  useDebrief,
  useSaveTodayPlan,
  useTodayPlanQuery,
  useTodayQuery,
} from '../hooks/useToday';
import { SETUPS, computePnL, type Trade } from '../types';
import { formatInr } from '../utils/currency';
import { marketStatus } from '../utils/market';
import { colors, radius, spacing } from '../utils/theme';
import type { RootStackParamList, RootTabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

const formatDayLabel = (d: Date = new Date()): string =>
  d
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .toUpperCase();

const greetingFor = (d: Date = new Date()): string => {
  const h = d.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 16) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
};

export const DashboardScreen = ({ navigation }: Props) => {
  const { user, kiteConnected, signOut, aiPro } = useAuth();
  const { data: trades = [], isLoading, refetch: refetchTrades } =
    useTradesQuery();
  const { data: positions = [] } = usePositionsQuery();
  const sync = useSyncTrades();
  const today = useTodayQuery();
  const planQuery = useTodayPlanQuery();
  const savePlan = useSaveTodayPlan();
  const debrief = useDebrief();
  const [planOpen, setPlanOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const activeRecovery = useActiveRecoveryQuery();
  const streaks = useStreaksQuery();

  const dayPnl = today.data?.stats.grossPnl ?? 0;
  const dayCount = today.data?.stats.tradeCount ?? 0;
  const dayWinRate = today.data?.stats.winRate ?? 0;
  const tilt = today.data?.tilt;
  const overtrading = today.data?.overtrading;
  const todayPlan = today.data?.plan ?? planQuery.data?.plan ?? null;
  const review = today.data?.review;
  const market = useMemo(marketStatus, [today.dataUpdatedAt]);

  const allStats = useMemo(() => {
    if (!trades.length) {
      return { totalPnL: 0, winRate: 0, count: 0, rr: 0 };
    }
    const pnls = trades.map((t) => computePnL(t));
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const totalPnL = pnls.reduce((a, b) => a + b, 0);
    const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length
      ? losses.reduce((a, b) => a + b, 0) / losses.length
      : 0;
    return {
      totalPnL,
      winRate: (wins.length / trades.length) * 100,
      count: trades.length,
      rr: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
    };
  }, [trades]);

  const sparkPoints = useMemo(() => {
    const last = trades.slice(0, 14).reverse().map((t) => t.grossPnl);
    return last.length ? last : [0];
  }, [trades]);

  const refreshing = isLoading || sync.isPending || today.isFetching;
  const onRefresh = async () => {
    await Promise.all([refetchTrades(), today.refetch(), planQuery.refetch()]);
  };

  const onDebrief = async () => {
    try {
      await debrief.mutateAsync();
    } catch (e) {
      Alert.alert(
        'Could not generate debrief',
        e instanceof Error ? e.message : 'Unknown error',
      );
    }
  };

  // The "what should I do right now" slot. Only one ever renders.
  const smartSlot = useMemo<SmartSlot | null>(() => {
    if (!kiteConnected) {
      return {
        kind: 'kite',
        icon: 'warning',
        tone: 'warning',
        title: 'Kite session expired',
        body: 'Tokens refresh at 6 AM IST. Reconnect to keep syncing trades.',
        cta: 'Reconnect',
        action: () => signOut(),
      };
    }
    if (tilt?.tilted) {
      return {
        kind: 'tilt',
        icon: 'flame',
        tone: 'danger',
        title:
          tilt.consecutiveLosses > 1
            ? `${tilt.consecutiveLosses} losses in a row`
            : 'Tilt risk detected',
        body: 'Start the loss-recovery protocol before your next entry.',
        cta: 'Recovery mode',
        action: () => setRecoveryOpen(true),
      };
    }
    if (
      todayPlan?.maxLossRupees != null &&
      dayPnl <= -todayPlan.maxLossRupees
    ) {
      return {
        kind: 'losscap',
        icon: 'shield',
        tone: 'danger',
        title: 'Daily loss cap hit',
        body: `You're at ${formatInr(dayPnl)}. Your plan said stop at ₹${todayPlan.maxLossRupees.toLocaleString('en-IN')}.`,
        cta: 'Recovery mode',
        action: () => setRecoveryOpen(true),
      };
    }
    if (
      overtrading &&
      (overtrading.level === 'high' || overtrading.level === 'extreme')
    ) {
      return {
        kind: 'overtrade',
        icon: 'speedometer',
        tone: 'warning',
        title: `${overtrading.today} trades — ${overtrading.ratio.toFixed(1)}× your pace`,
        body: 'Slow down. Re-read your plan before the next entry.',
        cta: todayPlan ? 'See plan' : 'Set plan',
        action: () => setPlanOpen(true),
      };
    }
    if (!todayPlan) {
      return {
        kind: 'plan',
        icon: 'compass',
        tone: 'accent',
        title: "Set today's intent",
        body: 'Sixty seconds. Max loss, max trades, planned setups. Scored at close.',
        cta: 'Set plan',
        action: () => setPlanOpen(true),
      };
    }
    if (aiPro && dayCount > 0 && !review) {
      return {
        kind: 'debrief',
        icon: 'moon',
        tone: 'accent',
        title: "Ready for tonight's debrief?",
        body:
          "AI reviews your trades: what worked, what didn't, one thing for tomorrow.",
        cta: debrief.isPending ? 'Thinking…' : 'Generate',
        action: onDebrief,
        loading: debrief.isPending,
      };
    }
    if (dayCount === 0) {
      return {
        kind: 'empty',
        icon: market.state === 'open' ? 'pulse' : 'sunny',
        tone: 'accent',
        title:
          market.state === 'open' ? 'Markets are live' : 'Markets closed',
        body:
          market.state === 'open'
            ? "No trades yet today. New fills sync from Kite automatically."
            : `Reopens in ${market.detail.replace('opens in ', '')}. Plan now, trade tomorrow.`,
        cta:
          market.state === 'open'
            ? 'Pull from Kite'
            : todayPlan
              ? 'Edit plan'
              : 'Set plan',
        action:
          market.state === 'open'
            ? () => sync.mutate()
            : () => setPlanOpen(true),
        loading: sync.isPending,
      };
    }
    return null;
  }, [
    kiteConnected,
    tilt,
    overtrading,
    todayPlan,
    review,
    dayCount,
    debrief.isPending,
    sync.isPending,
    navigation,
    signOut,
    market.state,
    market.detail,
    aiPro,
  ]);

  const recent = trades.slice(0, 4);

  // P&L direction → which accent wash sits on the Today card.
  const dayAccent =
    dayPnl > 0 ? accents.success : dayPnl < 0 ? accents.danger : accents.neutral;
  const dayColor =
    dayPnl > 0 ? colors.success : dayPnl < 0 ? colors.danger : colors.text;

  return (
    <View style={styles.root}>
      <View style={styles.canvas} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* STICKY HEADER — ribbon + account row. Content scrolls underneath. */}
        <View style={styles.stickyHeader}>
          <View style={styles.ribbon}>
            <View
              style={[
                styles.ribbonDot,
                {
                  backgroundColor:
                    market.state === 'open'
                      ? colors.success
                      : market.state === 'preopen'
                        ? colors.warning
                        : colors.textMuted,
                },
              ]}
            />
            <Text style={styles.ribbonText}>
              {formatDayLabel()}{' '}
              <Text style={styles.ribbonDim}>·</Text> MARKETS{' '}
              {market.label.toUpperCase()}{' '}
              <Text style={styles.ribbonDim}>· {market.detail}</Text>
            </Text>
          </View>

          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingPrefix}>{greetingFor()}</Text>
              <Text style={styles.greetingName}>
                {user?.shortname ?? user?.name?.split(' ')[0] ?? 'there'}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.textDim}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ============================================================== */}
          {/* THE CARD STACK                                                  */}
          {/* ============================================================== */}

          {/* TODAY card — premium balance-card vibe. Heavy embossed numbers. */}
          <WalletCard
            skin={skins.navy}
            accent={dayAccent}
            elevated
            style={styles.todayCard}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardKicker}>Today&apos;s P&amp;L</Text>
              <View style={styles.cardChip}>
                <View
                  style={[
                    styles.cardChipDot,
                    {
                      backgroundColor:
                        market.state === 'open'
                          ? colors.success
                          : colors.textMuted,
                    },
                  ]}
                />
                <Text style={styles.cardChipText}>
                  {market.state === 'open' ? 'LIVE' : 'CLOSED'}
                </Text>
              </View>
            </View>

            <View style={styles.heroRow}>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroCurrency, { color: dayColor }]}>₹</Text>
                <AnimatedCounter
                  value={Math.abs(dayPnl)}
                  withSign={false}
                  style={[styles.heroValue, { color: dayColor }]}
                />
              </View>
              {trades.length > 0 ? (
                <Sparkline
                  points={sparkPoints}
                  tone={dayPnl >= 0 ? 'success' : 'danger'}
                  width={72}
                  height={24}
                />
              ) : null}
            </View>

            <View style={styles.cardFooterRow}>
              <View style={styles.footStat}>
                <Text style={styles.footStatLabel}>Trades</Text>
                <Text style={styles.footStatValue}>{dayCount}</Text>
              </View>
              <View style={styles.footDivider} />
              <View style={styles.footStat}>
                <Text style={styles.footStatLabel}>Open</Text>
                <Text style={styles.footStatValue}>{positions.length}</Text>
              </View>
              <View style={styles.footDivider} />
              <View style={styles.footStat}>
                <Text style={styles.footStatLabel}>Win rate</Text>
                <Text style={styles.footStatValue}>
                  {dayCount > 0 ? `${dayWinRate.toFixed(0)}%` : '—'}
                </Text>
              </View>
              <Pressable
                onPress={() => sync.mutate()}
                disabled={sync.isPending}
                hitSlop={6}
                style={styles.syncBtn}
              >
                <Ionicons
                  name={sync.isPending ? 'sync' : 'arrow-down-outline'}
                  size={12}
                  color={colors.text}
                />
              </Pressable>
            </View>
          </WalletCard>

          {/* SMART ACTION card — tone-tinted skin. The "do this next" prompt. */}
          {smartSlot ? <SmartActionCard slot={smartSlot} /> : null}

          <View style={styles.toolsRow}>
            <ToolChip
              icon="shield-checkmark"
              label="Pre-trade gate"
              onPress={() => setGateOpen(true)}
            />
            <ToolChip
              icon="book"
              label="Playbook"
              onPress={() => navigation.navigate('Playbook')}
            />
            <ToolChip
              icon="document-text"
              label="Tax FY"
              onPress={() => navigation.navigate('Tax')}
            />
          </View>

          <MoodCheckinCard />
          <CostDragCard />

          {streaks.data?.streaks.some((s) => s.currentStreak > 0) ? (
            <WalletCard skin={skins.violet} accent={accents.success}>
              <Text style={styles.streakKicker}>Streaks</Text>
              {streaks.data.streaks
                .filter((s) => s.currentStreak > 0)
                .map((s) => (
                  <Text key={s.kind} style={styles.streakLine}>
                    {s.label}: {s.currentStreak} day
                    {s.currentStreak === 1 ? '' : 's'}
                  </Text>
                ))}
            </WalletCard>
          ) : null}

          {/* ALL-TIME card — single card with 2x2 stats grid. */}
          <SectionLabel>All-time</SectionLabel>
          <WalletCard skin={skins.navy} accent={accents.neutral}>
            <View style={styles.gridRow}>
              <GridCell
                label="Net P&L"
                value={formatInr(allStats.totalPnL)}
                tone={
                  allStats.totalPnL > 0
                    ? 'success'
                    : allStats.totalPnL < 0
                      ? 'danger'
                      : 'default'
                }
              />
              <View style={styles.gridDivV} />
              <GridCell
                label="Win rate"
                value={allStats.count ? `${allStats.winRate.toFixed(0)}%` : '—'}
                tone={
                  !allStats.count
                    ? 'default'
                    : allStats.winRate >= 50
                      ? 'success'
                      : 'danger'
                }
              />
            </View>
            <View style={styles.gridDivH} />
            <View style={styles.gridRow}>
              <GridCell
                label="Avg R : R"
                value={allStats.rr ? allStats.rr.toFixed(2) : '—'}
                tone={
                  !allStats.rr
                    ? 'default'
                    : allStats.rr >= 1.5
                      ? 'success'
                      : 'danger'
                }
              />
              <View style={styles.gridDivV} />
              <GridCell
                label="Round trips"
                value={String(allStats.count)}
              />
            </View>
          </WalletCard>

          {/* PLAN preview card — only when a plan exists. */}
          {todayPlan ? (
            <>
              <SectionLabel
                right={
                  <Pressable onPress={() => setPlanOpen(true)} hitSlop={6}>
                    <Text style={styles.linkSm}>Edit</Text>
                  </Pressable>
                }
              >
                Today&apos;s plan
              </SectionLabel>
              <WalletCard
                skin={skins.violet}
                accent={accents.accent}
                onPress={() => setPlanOpen(true)}
              >
                <View style={styles.planHeader}>
                  <Ionicons name="compass" size={16} color={colors.accent} />
                  <Text style={styles.planKicker}>Intent</Text>
                </View>
                <Text style={styles.planIntent} numberOfLines={3}>
                  {todayPlan.intention ?? 'No written intent.'}
                </Text>
                <View style={styles.planChipsRow}>
                  {todayPlan.maxLossRupees != null ? (
                    <PlanChip
                      label="Max loss"
                      value={`₹${todayPlan.maxLossRupees.toLocaleString('en-IN')}`}
                    />
                  ) : null}
                  {todayPlan.maxTrades != null ? (
                    <PlanChip
                      label="Max trades"
                      value={String(todayPlan.maxTrades)}
                    />
                  ) : null}
                  {todayPlan.plannedSetups.length > 0 ? (
                    <PlanChip
                      label="Setups"
                      value={`${todayPlan.plannedSetups.length}`}
                    />
                  ) : null}
                </View>
              </WalletCard>
            </>
          ) : null}

          {/* RECENT card — single card containing the row list. */}
          {recent.length > 0 ? (
            <>
              <SectionLabel
                right={
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Tabs', { screen: 'Journal' })
                    }
                    hitSlop={6}
                  >
                    <Text style={styles.linkSm}>View all</Text>
                  </Pressable>
                }
              >
                Recent
              </SectionLabel>
              <WalletCard
                skin={skins.navy}
                accent={accents.neutral}
                padded={false}
              >
                {recent.map((t, idx) => (
                  <RecentRow
                    key={t.id}
                    trade={t}
                    last={idx === recent.length - 1}
                    onPress={() =>
                      navigation.navigate('TradeDetail', { id: t.id })
                    }
                  />
                ))}
              </WalletCard>
            </>
          ) : null}

          {/* TONIGHT card — debrief when generated. */}
          {review ? (
            <>
              <SectionLabel
                right={
                  review.grade ? (
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{review.grade}</Text>
                    </View>
                  ) : null
                }
              >
                Tonight
              </SectionLabel>
              <WalletCard skin={skins.violet} accent={accents.accent}>
                <Text style={styles.debriefSummary}>{review.summary}</Text>
                {review.nextStep ? (
                  <View style={styles.nextStepRow}>
                    <View style={styles.nextStepBar} />
                    <Text style={styles.nextStepText}>{review.nextStep}</Text>
                  </View>
                ) : null}
              </WalletCard>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <PlanModal
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        initial={todayPlan ?? null}
        onSave={async (p) => {
          await savePlan.mutateAsync(p);
          setPlanOpen(false);
        }}
        saving={savePlan.isPending}
      />
      <PreTradeGateModal
        visible={gateOpen}
        onClose={() => setGateOpen(false)}
      />
      <LossRecoveryModal
        visible={recoveryOpen || !!activeRecovery.data?.recovery}
        onClose={() => setRecoveryOpen(false)}
        triggerPnl={dayPnl}
      />
    </View>
  );
};

const ToolChip = ({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) => (
  <PressableScale onPress={onPress} style={styles.toolChip}>
    <Ionicons name={icon} size={18} color={colors.accent} />
    <Text style={styles.toolChipLabel}>{label}</Text>
  </PressableScale>
);

// ---------------------------------------------------------------------------

interface SmartSlot {
  kind: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'accent' | 'warning' | 'danger';
  title: string;
  body: string;
  cta: string;
  action: () => void;
  loading?: boolean;
}

const SmartActionCard = ({ slot }: { slot: SmartSlot }) => {
  const palette = {
    accent: { skin: skins.accent, accent: accents.accent, color: colors.accent },
    warning: {
      skin: skins.warning,
      accent: accents.warning,
      color: colors.warning,
    },
    danger: {
      skin: skins.danger,
      accent: accents.danger,
      color: colors.danger,
    },
  }[slot.tone];

  return (
    <WalletCard
      skin={palette.skin}
      accent={palette.accent}
      onPress={slot.action}
      style={styles.smartCard}
    >
      <View style={styles.smartTopRow}>
        <View
          style={[
            styles.smartIcon,
            { backgroundColor: `${palette.color}26` },
          ]}
        >
          <Ionicons name={slot.icon} size={20} color={palette.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.smartTitle}>{slot.title}</Text>
          <Text style={styles.smartBody}>{slot.body}</Text>
        </View>
      </View>
      <View style={styles.smartFooter}>
        {slot.loading ? (
          <ActivityIndicator size="small" color={palette.color} />
        ) : (
          <View style={styles.smartCtaRow}>
            <Text style={[styles.smartCta, { color: palette.color }]}>
              {slot.cta}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={palette.color} />
          </View>
        )}
      </View>
    </WalletCard>
  );
};

const SectionLabel = ({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionLabel}>{children}</Text>
    {right}
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

const PlanChip = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.planChip}>
    <Text style={styles.planChipLabel}>{label}</Text>
    <Text style={styles.planChipValue}>{value}</Text>
  </View>
);

const RecentRow = ({
  trade,
  onPress,
  last,
}: {
  trade: Trade;
  onPress: () => void;
  last: boolean;
}) => {
  const pnl = trade.grossPnl;
  const positive = pnl >= 0;
  const untagged = !trade.journal?.emotion && !trade.journal?.setup;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <View
        style={[
          styles.recentRow,
          !last && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.recentDot,
            { backgroundColor: positive ? colors.success : colors.danger },
          ]}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.recentSymbolRow}>
            <Text style={styles.recentTicker} numberOfLines={1}>
              {trade.tradingsymbol}
            </Text>
            <Text style={styles.recentSide}>{trade.side}</Text>
            {untagged ? (
              <View style={styles.recentTagPill}>
                <Text style={styles.recentTagPillText}>tag</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.recentMeta}>
            {trade.quantity} @ {trade.avgEntryPrice.toFixed(2)} →{' '}
            {trade.avgExitPrice.toFixed(2)}
          </Text>
        </View>
        <Text
          style={[
            styles.recentPnl,
            { color: positive ? colors.success : colors.danger },
          ]}
        >
          {formatInr(pnl)}
        </Text>
      </View>
    </PressableScale>
  );
};

// ---------------------------------------------------------------------------
// Plan modal — now wrapped in a WalletCard sheet so it matches the dashboard.

const PlanModal = ({
  visible,
  onClose,
  initial,
  onSave,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  initial: {
    intention: string | null;
    maxLossRupees: number | null;
    maxTrades: number | null;
    plannedSetups: string[];
    stopRule: string | null;
  } | null;
  onSave: (p: {
    intention: string | null;
    maxLossRupees: number | null;
    maxTrades: number | null;
    plannedSetups: string[];
    stopRule: string | null;
  }) => Promise<void>;
  saving: boolean;
}) => {
  const [intention, setIntention] = useState(initial?.intention ?? '');
  const [maxLoss, setMaxLoss] = useState(
    initial?.maxLossRupees != null ? String(initial.maxLossRupees) : '',
  );
  const [maxTrades, setMaxTrades] = useState(
    initial?.maxTrades != null ? String(initial.maxTrades) : '',
  );
  const [stopRule, setStopRule] = useState(initial?.stopRule ?? '');
  const [setups, setSetups] = useState<string[]>(initial?.plannedSetups ?? []);

  const toggleSetup = (s: string) =>
    setSetups((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const submit = () => {
    const trimmed = intention.trim();
    const stop = stopRule.trim();
    const parsedLoss = maxLoss ? Number(maxLoss) : null;
    const parsedTrades = maxTrades ? Number(maxTrades) : null;
    void onSave({
      intention: trimmed || null,
      maxLossRupees:
        parsedLoss != null && Number.isFinite(parsedLoss) && parsedLoss >= 0
          ? Math.floor(parsedLoss)
          : null,
      maxTrades:
        parsedTrades != null && Number.isFinite(parsedTrades) && parsedTrades > 0
          ? Math.floor(parsedTrades)
          : null,
      plannedSetups: setups,
      stopRule: stop || null,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.fsRoot}>
        {/* Ambient background — full bleed gradient */}
        <LinearGradient
          colors={['#1B1338', '#0A0718']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Soft violet glow at top — gives the screen identity without busy chrome */}
        <LinearGradient
          colors={['rgba(140,99,255,0.22)', 'rgba(140,99,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fsGlow}
          pointerEvents="none"
        />

        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* Sticky header */}
          <View style={styles.fsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalKicker}>Pre-market</Text>
              <Text style={styles.modalTitle}>Today&apos;s plan</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.fsBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FormLabel>Intent</FormLabel>
            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="What's the plan today?"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { minHeight: 96 }]}
              multiline
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <FormLabel>Max loss (₹)</FormLabel>
                <TextInput
                  value={maxLoss}
                  onChangeText={setMaxLoss}
                  placeholder="2000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <FormLabel>Max trades</FormLabel>
                <TextInput
                  value={maxTrades}
                  onChangeText={setMaxTrades}
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <FormLabel>Setups you&apos;ll take</FormLabel>
            <View style={styles.pillWrap}>
              {SETUPS.map((s) => (
                <Pill
                  key={s}
                  label={s}
                  selected={setups.includes(s)}
                  tone="primary"
                  onPress={() => toggleSetup(s)}
                />
              ))}
            </View>

            <FormLabel>What makes you stop</FormLabel>
            <TextInput
              value={stopRule}
              onChangeText={setStopRule}
              placeholder="2 reds in a row, or down ₹X"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { minHeight: 72 }]}
              multiline
            />
          </ScrollView>

          {/* Sticky CTA — fixed at bottom, always visible. */}
          <View style={styles.fsActionBar}>
            <Button
              label={saving ? 'Saving…' : 'Save plan'}
              variant="gradient"
              onPress={submit}
              disabled={saving}
              fullWidth
              leftIcon={
                <Ionicons name="checkmark" size={16} color={colors.white} />
              }
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.formLabel}>{children}</Text>
);

// ---------------------------------------------------------------------------

const PAGE_GAP = 12;

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

  // STICKY HEADER — sits above the ScrollView. Solid bg + hairline divider.
  // zIndex is intentionally low (above scroll content only) so a Modal can
  // cleanly overlay it on web. On native, RN Modal is a separate window and
  // this doesn't matter.
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#06081A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    zIndex: 1,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    // Breathing room before first card so kicker/chip don't immediately
    // scroll under the sticky header on tiny scroll deltas.
    paddingTop: spacing.xl,
    gap: spacing.md,
  },

  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolChipLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  streakKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  streakLine: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 4 },

  // Status ribbon (now inside sticky header)
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  ribbonDot: { width: 6, height: 6, borderRadius: 3 },
  ribbonText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: colors.textDim,
    fontVariant: ['tabular-nums'],
  },
  ribbonDim: { color: colors.textMuted, fontWeight: '600' },

  // Account header (inside sticky header)
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 2,
  },
  greetingPrefix: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ----- Today card -----
  todayCard: { marginBottom: PAGE_GAP },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textDim,
    textTransform: 'uppercase',
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardChipDot: { width: 5, height: 5, borderRadius: 3 },
  cardChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.text,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  heroCurrency: {
    fontSize: 26,
    fontWeight: '600',
    marginRight: 4,
    letterSpacing: -0.4,
  },
  heroValue: {
    fontSize: 50,
    fontWeight: '700',
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
    lineHeight: 54,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
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
    fontSize: 16,
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
  syncBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  // ----- Smart action card -----
  smartCard: { marginBottom: PAGE_GAP },
  smartTopRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  smartIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  smartBody: {
    color: 'rgba(244,246,251,0.75)',
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: 0.05,
  },
  smartFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    alignItems: 'flex-end',
  },
  smartCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smartCta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },

  // ----- Section label (sits above each card) -----
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  linkSm: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.3,
  },

  // ----- All-time grid -----
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

  // ----- Plan card -----
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  planKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  planIntent: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.1,
    marginBottom: spacing.md,
  },
  planChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  planChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  planChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  // ----- Recent row -----
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg + 4,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
  },
  recentSymbolRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  recentTicker: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  recentSide: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  recentTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  recentTagPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  recentMeta: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  recentPnl: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },

  // ----- Tonight (debrief) -----
  gradeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  debriefSummary: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.05,
    fontWeight: '500',
  },
  nextStepRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  nextStepBar: {
    width: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  nextStepText: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textDim,
    lineHeight: 20,
    letterSpacing: 0.05,
  },

  // ----- Modal -----
  // FULL-SCREEN MODAL (Today's plan). Acts like a dedicated screen — no
  // bottom-sheet edge-cases, no tab bar bleed-through, sticky bottom CTA.
  fsRoot: {
    flex: 1,
    backgroundColor: '#0A0718',
  },
  fsGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  fsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  fsBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  fsActionBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,7,24,0.92)',
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(183,148,255,0.95)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.7,
    lineHeight: 32,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textDim,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  formRow: { flexDirection: 'row' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

export default DashboardScreen;
