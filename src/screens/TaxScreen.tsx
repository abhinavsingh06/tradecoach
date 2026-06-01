import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { WalletCard, accents, skins } from '../components/WalletCard';
import { useTaxQuery } from '../hooks/useFeatures';
import { formatInr, formatInrPlain } from '../utils/currency';
import { colors, spacing } from '../utils/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tax'>;

/** Indian FY: Apr year → Mar year+1. Before Apr, we're still in prior FY. */
const currentFyStartYear = (): number => {
  const d = new Date();
  const m = d.getMonth(); // 0=Jan
  return m < 3 ? d.getFullYear() - 1 : d.getFullYear();
};

export const TaxScreen = (_props: Props) => {
  const year = currentFyStartYear();
  const { data, isLoading, refetch, isFetching } = useTaxQuery(year);

  const splits = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.splits);
  }, [data]);

  return (
    <View style={styles.root}>
      <View style={styles.canvas} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        >
          <Text style={styles.kicker}>ITR-3 helper</Text>
          <Text style={styles.title}>Tax co-pilot</Text>
          <Text style={styles.sub}>
            FY {data?.fy ?? `${year}-${String(year + 1).slice(2)}`} · estimated
            from synced trades
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !data ? null : (
            <>
              <WalletCard skin={skins.navy} accent={accents.accent} elevated>
                <Text style={styles.cardLabel}>Net business income (est.)</Text>
                <Text style={styles.hero}>
                  {formatInr(data.summary.netIncome)}
                </Text>
                <View style={styles.grid}>
                  <Stat label="Gross P&L" value={formatInr(data.summary.grossPnl)} />
                  <Stat
                    label="Est. costs"
                    value={formatInr(data.summary.estimatedCosts)}
                  />
                  <Stat
                    label="Turnover"
                    value={formatInrPlain(data.summary.turnover)}
                  />
                  <Stat label="Trades" value={String(data.summary.trades)} />
                </View>
              </WalletCard>

              {splits.map(([key, split]) => (
                <WalletCard
                  key={key}
                  skin={skins.violet}
                  accent={accents.neutral}
                >
                  <Text style={styles.splitKind}>{split.kind}</Text>
                  <Text style={styles.splitPnl}>{formatInr(split.pnl)}</Text>
                  <Text style={styles.splitMeta}>
                    {split.trades} trades
                    {'turnover' in split && split.turnover != null
                      ? ` · turnover ${formatInrPlain(split.turnover)}`
                      : ''}
                  </Text>
                </WalletCard>
              ))}

              <Text style={styles.disclaimer}>{data.note}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  canvas: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  sub: { color: colors.textDim, marginBottom: spacing.md },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  hero: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { width: '45%' },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 2 },
  splitKind: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  splitPnl: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  splitMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
