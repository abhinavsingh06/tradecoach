import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../components/Button';
import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { VoiceMemoRecorder } from '../components/VoiceMemoRecorder';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { useAuth } from '../auth/AuthProvider';
import { useSaveJournal, useTradesQuery } from '../hooks/useTrades';
import {
  useAcceptDraft,
  useJournalDraft,
  useSimilarTrades,
  useSymbolStats,
} from '../hooks/useToday';
import {
  EMOTIONS,
  SETUPS,
  type Emotion,
  type Setup,
  type SimilarTrade,
} from '../types';
import { formatInr, formatInrPlain } from '../utils/currency';
import { colors, spacing } from '../utils/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TradeDetail'>;

export const TradeDetailScreen = ({ navigation, route }: Props) => {
  const { aiPro } = useAuth();
  const { data: trades = [] } = useTradesQuery();
  const saveJournal = useSaveJournal();
  const draftMutation = useJournalDraft();
  const acceptDraft = useAcceptDraft();
  const trade = useMemo(
    () => trades.find((t) => t.id === route.params.id),
    [trades, route.params.id],
  );
  const similar = useSimilarTrades(trade?.id);
  const symbolStats = useSymbolStats(trade?.tradingsymbol);

  const [emotion, setEmotion] = useState<Emotion | null>(
    (trade?.journal?.emotion as Emotion) ?? null,
  );
  const [setup, setSetup] = useState<Setup | null>(
    (trade?.journal?.setup as Setup) ?? null,
  );
  const [notes, setNotes] = useState(trade?.journal?.notes ?? '');
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!trade) return;
    if (trade.journal?.emotion && !emotion)
      setEmotion(trade.journal.emotion as Emotion);
    if (trade.journal?.setup && !setup) setSetup(trade.journal.setup as Setup);
    if (trade.journal?.notes && !notes) setNotes(trade.journal.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade?.id]);

  if (!trade) {
    return (
      <View style={[styles.root, { padding: spacing.xl }]}>
        <View style={styles.canvas} />
        <Text style={styles.title}>Trade not found</Text>
      </View>
    );
  }

  const pnl = trade.grossPnl;
  const positive = pnl >= 0;
  const durationMin =
    (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) /
    60000;
  const aiDraft = trade.journal?.aiDraft ?? null;
  const draftFresh = aiDraft &&
    Date.now() - new Date(aiDraft.generatedAt).getTime() < 24 * 60 * 60 * 1000;

  const generateDraft = async () => {
    setDraftError(null);
    try {
      const { draft } = await draftMutation.mutateAsync(trade.id);
      if (draft.emotion) setEmotion(draft.emotion as Emotion);
      if (draft.setup) setSetup(draft.setup as Setup);
      if (draft.notes) setNotes(draft.notes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setDraftError(msg);
    }
  };

  const acceptCurrentDraft = async () => {
    if (!aiDraft) return;
    if (aiDraft.emotion) setEmotion(aiDraft.emotion as Emotion);
    if (aiDraft.setup) setSetup(aiDraft.setup as Setup);
    if (aiDraft.notes) setNotes(aiDraft.notes);
    void acceptDraft.mutateAsync(trade.id).catch(() => undefined);
  };

  const onSave = async () => {
    try {
      await saveJournal.mutateAsync({
        tradeId: trade.id,
        emotion,
        setup,
        notes: notes.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Unknown error',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.canvas} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* HERO card — symbol + P&L. The "boarding pass" for this trade. */}
        <WalletCard
          skin={skins.navy}
          accent={positive ? accents.success : accents.danger}
          elevated
          style={{ marginBottom: PAGE_GAP }}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>
                {trade.product} · {trade.exchange}
              </Text>
              <View style={styles.symbolRow}>
                <Text style={styles.symbol} numberOfLines={1}>
                  {trade.tradingsymbol}
                </Text>
                <View
                  style={[
                    styles.sideTag,
                    {
                      backgroundColor:
                        trade.side === 'long'
                          ? 'rgba(52,211,153,0.18)'
                          : 'rgba(248,113,113,0.18)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sideTagText,
                      {
                        color:
                          trade.side === 'long' ? colors.success : colors.danger,
                      },
                    ]}
                  >
                    {trade.side}
                  </Text>
                </View>
              </View>
            </View>
            <Text
              style={[
                styles.pnl,
                { color: positive ? colors.success : colors.danger },
              ]}
            >
              {formatInr(pnl)}
            </Text>
          </View>

          <View style={styles.heroFooterRow}>
            <FootStat
              label="Entry"
              value={trade.avgEntryPrice.toFixed(2)}
            />
            <View style={styles.footDivider} />
            <FootStat label="Exit" value={trade.avgExitPrice.toFixed(2)} />
            <View style={styles.footDivider} />
            <FootStat label="Qty" value={String(trade.quantity)} />
            <View style={styles.footDivider} />
            <FootStat
              label="Held"
              value={
                durationMin >= 60
                  ? `${(durationMin / 60).toFixed(1)}h`
                  : `${Math.round(durationMin)}m`
              }
            />
          </View>

          <Text style={styles.heroTimestamp}>
            Closed {new Date(trade.closedAt).toLocaleString('en-IN')}
          </Text>
        </WalletCard>

        {/* Symbol memory card */}
        {symbolStats.data && symbolStats.data.overall.count > 1 ? (
          <>
            <SectionLabel icon="time-outline">
              You&apos;ve taken {symbolStats.data.symbol} before
            </SectionLabel>
            <SymbolMemoryCard stats={symbolStats.data} />
          </>
        ) : null}

        {aiPro ? (
          <>
            <SectionLabel icon="sparkles-outline">AI draft</SectionLabel>
            <AiDraftCard
              loading={draftMutation.isPending}
              error={draftError}
              draft={aiDraft}
              fresh={!!draftFresh}
              onGenerate={generateDraft}
              onAccept={acceptCurrentDraft}
            />
          </>
        ) : null}

        {/* Setup pills */}
        <SectionLabel>Setup</SectionLabel>
        <WalletCard skin={skins.navy} accent={accents.neutral}>
          <View style={styles.wrap}>
            {SETUPS.map((s) => (
              <Pill
                key={s}
                label={s}
                tone="primary"
                selected={setup === s}
                onPress={() => setSetup(setup === s ? null : s)}
              />
            ))}
          </View>
        </WalletCard>

        {/* Emotion pills */}
        <SectionLabel>Emotion</SectionLabel>
        <WalletCard skin={skins.navy} accent={accents.neutral}>
          <View style={styles.wrap}>
            {EMOTIONS.map((e) => (
              <Pill
                key={e}
                label={e}
                selected={emotion === e}
                tone={
                  ['calm', 'confident', 'patient'].includes(e)
                    ? 'success'
                    : ['fomo', 'fearful', 'greedy', 'revenge', 'tilted'].includes(e)
                      ? 'danger'
                      : 'default'
                }
                onPress={() => setEmotion(emotion === e ? null : e)}
              />
            ))}
          </View>
        </WalletCard>

        {aiPro ? (
          <>
            <SectionLabel>Voice</SectionLabel>
            <WalletCard skin={skins.violet} accent={accents.accent}>
              <VoiceMemoRecorder
                tradeId={trade.id}
                onStructured={({ emotion: e, setup: s, notes: n }) => {
                  if (e) setEmotion(e);
                  if (s) setSetup(s);
                  if (n) setNotes(n);
                }}
              />
              <Text style={styles.voiceHint}>
                Speak after the trade — we transcribe and fill journal fields.
              </Text>
            </WalletCard>
          </>
        ) : null}

        {/* Notes */}
        <SectionLabel>Notes</SectionLabel>
        <WalletCard skin={skins.navy} accent={accents.neutral} padded={false}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What was your thesis? What did you do well or poorly?"
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            multiline
          />
        </WalletCard>

        {/* Similar trades carousel */}
        <SimilarSection
          loading={similar.isLoading}
          trades={similar.data?.similar ?? []}
          onOpen={(id) => navigation.push('TradeDetail', { id })}
        />

        <Button
          label={saveJournal.isPending ? 'Saving…' : 'Save journal'}
          onPress={onSave}
          variant="gradient"
          fullWidth
          style={{ marginTop: spacing.xl }}
          disabled={saveJournal.isPending}
          leftIcon={<Ionicons name="checkmark" size={18} color={colors.white} />}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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

const AiDraftCard = ({
  loading,
  error,
  draft,
  fresh,
  onGenerate,
  onAccept,
}: {
  loading: boolean;
  error: string | null;
  draft: {
    emotion: string | null;
    setup: string | null;
    notes: string | null;
    rationale: string | null;
    generatedAt: string;
  } | null;
  fresh: boolean;
  onGenerate: () => void;
  onAccept: () => void;
}) => (
  <WalletCard skin={skins.violet} accent={accents.accent}>
    <View style={styles.draftHeader}>
      <View style={styles.draftTitleRow}>
        <View style={styles.draftIcon}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
        </View>
        <Text style={styles.draftTitle}>AI draft</Text>
        {fresh && draft ? (
          <View style={styles.draftFreshPill}>
            <Text style={styles.draftFreshText}>ready</Text>
          </View>
        ) : null}
      </View>
      <Pressable onPress={onGenerate} disabled={loading} hitSlop={8}>
        {loading ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Text style={styles.draftRefresh}>
            {draft ? 'Regenerate' : 'Generate'}
          </Text>
        )}
      </Pressable>
    </View>
    {draft ? (
      <>
        <View style={styles.draftSuggestions}>
          {draft.setup ? (
            <DraftChip label="Setup" value={draft.setup} />
          ) : null}
          {draft.emotion ? (
            <DraftChip label="Emotion" value={draft.emotion} />
          ) : null}
        </View>
        {draft.notes ? (
          <View style={styles.quoteRow}>
            <View style={styles.quoteBar} />
            <Text style={styles.draftNotes}>{draft.notes}</Text>
          </View>
        ) : null}
        {draft.rationale ? (
          <Text style={styles.draftRationale}>Why · {draft.rationale}</Text>
        ) : null}
        <Pressable onPress={onAccept} style={styles.draftAcceptBtn}>
          <Ionicons name="arrow-down-circle" size={14} color={colors.accent} />
          <Text style={styles.draftAcceptText}>Apply to fields</Text>
        </Pressable>
      </>
    ) : error ? (
      <Text style={styles.draftError}>{error}</Text>
    ) : (
      <Text style={styles.draftHint}>
        Tap &ldquo;Generate&rdquo; and your coach will propose an emotion, setup, and
        one-line notes — grounded in your past trades on this symbol.
      </Text>
    )}
  </WalletCard>
);

const DraftChip = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.draftChip}>
    <Text style={styles.draftChipLabel}>{label}</Text>
    <Text style={styles.draftChipValue}>{value}</Text>
  </View>
);

const SymbolMemoryCard = ({
  stats,
}: {
  stats: {
    symbol: string;
    overall: {
      count: number;
      totalPnl: number;
      winRate: number;
      avgWin: number;
      avgLoss: number;
    };
    longs: { count: number; totalPnl: number; winRate: number };
    shorts: { count: number; totalPnl: number; winRate: number };
  };
}) => {
  const positive = stats.overall.totalPnl >= 0;
  return (
    <WalletCard skin={skins.navy} accent={accents.neutral}>
      <View style={styles.memHero}>
        <View style={styles.memHeroLeft}>
          <Text style={styles.memHeroKicker}>Lifetime net</Text>
          <Text
            style={[
              styles.memHeroValue,
              { color: positive ? colors.success : colors.danger },
            ]}
          >
            {formatInr(stats.overall.totalPnl)}
          </Text>
        </View>
        <View style={styles.memHeroRight}>
          <Text style={styles.memHeroMeta}>
            {stats.overall.count} trips · {stats.overall.winRate.toFixed(0)}% win
          </Text>
        </View>
      </View>
      <View style={styles.memDiv} />
      <View style={styles.memSplitRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memSplitLabel}>Longs</Text>
          <Text
            style={[
              styles.memSplitValue,
              {
                color:
                  stats.longs.count === 0
                    ? colors.textMuted
                    : stats.longs.totalPnl >= 0
                      ? colors.success
                      : colors.danger,
              },
            ]}
          >
            {stats.longs.count
              ? `${formatInrPlain(stats.longs.totalPnl)} · ${stats.longs.winRate.toFixed(0)}%`
              : '—'}
          </Text>
        </View>
        <View style={styles.gridDivV} />
        <View style={{ flex: 1 }}>
          <Text style={styles.memSplitLabel}>Shorts</Text>
          <Text
            style={[
              styles.memSplitValue,
              {
                color:
                  stats.shorts.count === 0
                    ? colors.textMuted
                    : stats.shorts.totalPnl >= 0
                      ? colors.success
                      : colors.danger,
              },
            ]}
          >
            {stats.shorts.count
              ? `${formatInrPlain(stats.shorts.totalPnl)} · ${stats.shorts.winRate.toFixed(0)}%`
              : '—'}
          </Text>
        </View>
      </View>
    </WalletCard>
  );
};

const SimilarSection = ({
  loading,
  trades,
  onOpen,
}: {
  loading: boolean;
  trades: SimilarTrade[];
  onOpen: (id: string) => void;
}) => {
  if (loading) {
    return (
      <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!trades.length) return null;
  return (
    <>
      <SectionLabel icon="layers-outline">
        Similar trades you&apos;ve taken
      </SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.md,
          paddingRight: spacing.lg,
        }}
      >
        {trades.map((t) => {
          const positive = t.grossPnl >= 0;
          return (
            <PressableScale
              key={t.id}
              onPress={() => onOpen(t.id)}
              scaleTo={0.97}
              style={{ width: 220 }}
            >
              <WalletCard
                skin={skins.navy}
                accent={positive ? accents.success : accents.danger}
              >
                <View style={styles.simHeader}>
                  <Text style={styles.simTicker} numberOfLines={1}>
                    {t.tradingsymbol}
                  </Text>
                  <View
                    style={[
                      styles.sideTag,
                      {
                        backgroundColor:
                          t.side === 'long'
                            ? 'rgba(52,211,153,0.18)'
                            : 'rgba(248,113,113,0.18)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sideTagText,
                        {
                          color:
                            t.side === 'long' ? colors.success : colors.danger,
                        },
                      ]}
                    >
                      {t.side}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.simPnl,
                    { color: positive ? colors.success : colors.danger },
                  ]}
                >
                  {formatInr(t.grossPnl)}
                </Text>
                <Text style={styles.simMeta}>
                  {t.quantity} @ {t.avgEntryPrice.toFixed(2)} →{' '}
                  {t.avgExitPrice.toFixed(2)}
                </Text>
                {t.journal?.setup || t.journal?.emotion ? (
                  <Text style={styles.simTags}>
                    {[t.journal?.setup, t.journal?.emotion]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.simDate}>
                  {new Date(t.closedAt).toLocaleDateString('en-IN')}
                </Text>
              </WalletCard>
            </PressableScale>
          );
        })}
      </ScrollView>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    paddingTop: spacing.sm,
  },

  // Hero card
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  symbol: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  sideTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sideTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pnl: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  heroFooterRow: {
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
    fontSize: 14,
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
  heroTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
    letterSpacing: 0.3,
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

  // Symbol memory
  memHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  memHeroLeft: { flex: 1 },
  memHeroRight: { alignItems: 'flex-end' },
  memHeroKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  memHeroValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  memHeroMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDim,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  memDiv: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.md,
  },
  memSplitRow: { flexDirection: 'row', alignItems: 'center' },
  memSplitLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  memSplitValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  gridDivV: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
    alignSelf: 'stretch',
  },

  // AI draft
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  draftIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  draftFreshPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  draftFreshText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  draftRefresh: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  draftSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  draftChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  draftChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  draftChipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  quoteRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  quoteBar: {
    width: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  draftNotes: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    letterSpacing: -0.05,
  },
  draftRationale: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: spacing.sm,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  draftAcceptBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(183,148,255,0.30)',
  },
  draftAcceptText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  draftHint: {
    fontSize: 13.5,
    color: colors.textDim,
    marginTop: spacing.sm,
    lineHeight: 20,
    letterSpacing: 0.05,
  },
  draftError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.sm,
    lineHeight: 17,
  },

  // Pills + notes
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  voiceHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  notesInput: {
    padding: spacing.lg,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
    fontSize: 15,
    letterSpacing: -0.05,
  },

  // Similar
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  simTicker: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  simPnl: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    marginTop: spacing.md,
  },
  simMeta: {
    fontSize: 11.5,
    color: colors.textDim,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  simTags: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 6,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  simDate: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
});

export default TradeDetailScreen;
