import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pill } from '../components/Pill';
import { PressableScale } from '../components/PressableScale';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { useTradesQuery } from '../hooks/useTrades';
import { computePnL, type Trade } from '../types';
import { formatInr } from '../utils/currency';
import { colors, spacing } from '../utils/theme';
import type { RootStackParamList, RootTabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Journal'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterMode = 'all' | 'untagged' | 'tagged' | 'win' | 'loss';

export const JournalScreen = ({ navigation }: Props) => {
  const { data: trades = [], isLoading } = useTradesQuery();
  const [filter, setFilter] = useState<FilterMode>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'untagged':
        return trades.filter(
          (t) => !t.journal?.emotion && !t.journal?.setup,
        );
      case 'tagged':
        return trades.filter((t) => t.journal?.emotion || t.journal?.setup);
      case 'win':
        return trades.filter((t) => computePnL(t) >= 0);
      case 'loss':
        return trades.filter((t) => computePnL(t) < 0);
      default:
        return trades;
    }
  }, [trades, filter]);

  const untaggedCount = trades.filter(
    (t) => !t.journal?.emotion && !t.journal?.setup,
  ).length;

  // Group filtered trades by calendar day so the list reads like wallet sections
  // rather than an unbroken feed.
  const grouped = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of filtered) {
      const key = new Date(t.closedAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [filtered]);

  return (
    <View style={styles.root}>
      <View style={styles.canvas} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* STICKY HEADER — title + subtitle + filter pills always visible. */}
        <View style={styles.stickyHeader}>
          <Text style={styles.kicker}>Journal</Text>
          <Text style={styles.title}>Round trips</Text>
          {trades.length ? (
            <Text style={styles.subtitle}>
              {trades.length} closed ·{' '}
              {untaggedCount > 0
                ? `${untaggedCount} untagged`
                : 'all tagged'}
            </Text>
          ) : null}
          {trades.length ? (
            <View style={styles.filterRow}>
              <Pill
                label="All"
                tone="primary"
                selected={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <Pill
                label="Untagged"
                tone="accent"
                selected={filter === 'untagged'}
                onPress={() => setFilter('untagged')}
              />
              <Pill
                label="Tagged"
                tone="primary"
                selected={filter === 'tagged'}
                onPress={() => setFilter('tagged')}
              />
              <Pill
                label="Wins"
                tone="success"
                selected={filter === 'win'}
                onPress={() => setFilter('win')}
              />
              <Pill
                label="Losses"
                tone="danger"
                selected={filter === 'loss'}
                onPress={() => setFilter('loss')}
              />
            </View>
          ) : null}
        </View>

        <FlatList
          data={grouped}
          keyExtractor={(g) => g.date}
          contentContainerStyle={
            grouped.length ? styles.list : styles.emptyContent
          }
          renderItem={({ item }) => {
            const dayPnl = item.items.reduce((a, t) => a + computePnL(t), 0);
            return (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionLabel}>{item.date}</Text>
                  <Text
                    style={[
                      styles.sectionPnl,
                      {
                        color:
                          dayPnl > 0
                            ? colors.success
                            : dayPnl < 0
                              ? colors.danger
                              : colors.textDim,
                      },
                    ]}
                  >
                    {formatInr(dayPnl)}
                  </Text>
                </View>
                <WalletCard
                  skin={skins.navy}
                  accent={accents.neutral}
                  padded={false}
                >
                  {item.items.map((t, idx) => (
                    <TradeRow
                      key={t.id}
                      trade={t}
                      last={idx === item.items.length - 1}
                      onPress={() =>
                        navigation.navigate('TradeDetail', { id: t.id })
                      }
                    />
                  ))}
                </WalletCard>
              </View>
            );
          }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : (
              <WalletCard
                skin={skins.violet}
                accent={accents.accent}
                style={{ marginTop: spacing.lg }}
              >
                <View style={styles.emptyIcon}>
                  <Ionicons name="journal-outline" size={24} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyText}>
                  Sync from the Today tab. Closed round trips land here so you
                  can tag emotion &amp; setup — or let the AI draft them.
                </Text>
              </WalletCard>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
};

const TradeRow = ({
  trade,
  onPress,
  last,
}: {
  trade: Trade;
  onPress: () => void;
  last: boolean;
}) => {
  const pnl = computePnL(trade);
  const positive = pnl >= 0;
  const tagged = trade.journal?.emotion || trade.journal?.setup;
  const draftPending =
    !!trade.journal?.aiDraft && !trade.journal?.aiDraftAcceptedAt;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <View
        style={[
          styles.row,
          !last && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: 'rgba(255,255,255,0.06)',
          },
        ]}
      >
        <View
          style={[
            styles.rowDot,
            { backgroundColor: positive ? colors.success : colors.danger },
          ]}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.rowHeader}>
            <Text style={styles.ticker} numberOfLines={1}>
              {trade.tradingsymbol}
            </Text>
            <Text style={styles.side}>{trade.side}</Text>
            {!tagged ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>tag</Text>
              </View>
            ) : null}
            {draftPending ? (
              <View style={[styles.tag, styles.tagDraft]}>
                <Ionicons name="sparkles" size={9} color={colors.accent} />
                <Text style={styles.tagText}>AI</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {trade.quantity} @ {trade.avgEntryPrice.toFixed(2)} →{' '}
            {trade.avgExitPrice.toFixed(2)}
          </Text>
          {tagged ? (
            <Text style={styles.metaDim}>
              {[trade.journal?.setup, trade.journal?.emotion]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
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
    </PressableScale>
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    paddingTop: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Sticky header
  stickyHeader: {
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#06081A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  section: { marginTop: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionPnl: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg + 4,
  },
  rowDot: { width: 6, height: 6, borderRadius: 3, alignSelf: 'center' },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ticker: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    maxWidth: 200,
  },
  side: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  tagDraft: { backgroundColor: 'rgba(110,139,255,0.18)' },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textDim,
    marginTop: 4,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  metaDim: {
    color: colors.textMuted,
    marginTop: 3,
    fontSize: 11,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  pnl: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },

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

export default JournalScreen;
