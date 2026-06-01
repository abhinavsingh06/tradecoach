import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { usePlaybookQuery } from '../hooks/useFeatures';
import { formatInr } from '../utils/currency';
import { colors, spacing } from '../utils/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Playbook'>;

export const PlaybookScreen = (_props: Props) => {
  const { data, isLoading, refetch, isFetching } = usePlaybookQuery();

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
          <Text style={styles.kicker}>Your edge</Text>
          <Text style={styles.title}>Personal playbook</Text>
          <Text style={styles.sub}>
            Setups you&apos;ve tagged — ranked by what actually makes money.
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !data || data.totalTagged < 3 ? (
            <WalletCard skin={skins.violet} accent={accents.accent}>
              <Ionicons name="book-outline" size={22} color={colors.accent} />
              <Text style={styles.emptyTitle}>Tag more trades</Text>
              <Text style={styles.emptyText}>
                Journal at least 3 trades with a setup tag. We&apos;ll surface
                your winners and leaks automatically.
                {data
                  ? `\n\n${data.untaggedCount} trades still untagged.`
                  : ''}
              </Text>
            </WalletCard>
          ) : (
            <>
              <Text style={styles.section}>Keep doing</Text>
              {data.winners.map((w) => (
                <WalletCard
                  key={w.setup}
                  skin={skins.navy}
                  accent={accents.success}
                  style={styles.row}
                >
                  <Text style={styles.setupName}>{w.setup}</Text>
                  <Text style={styles.setupMeta}>
                    {w.count} trades · {w.winRate.toFixed(0)}% win ·{' '}
                    {formatInr(w.totalPnl)}
                  </Text>
                </WalletCard>
              ))}
              {data.losers.length > 0 ? (
                <>
                  <Text style={styles.section}>Stop or fix</Text>
                  {data.losers.map((l) => (
                    <WalletCard
                      key={l.setup}
                      skin={skins.danger}
                      accent={accents.danger}
                      style={styles.row}
                    >
                      <Text style={styles.setupName}>{l.setup}</Text>
                      <Text style={styles.setupMeta}>
                        {l.count} trades · {l.winRate.toFixed(0)}% win ·{' '}
                        {formatInr(l.totalPnl)}
                      </Text>
                    </WalletCard>
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  canvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  sub: { color: colors.textDim, marginBottom: spacing.md, lineHeight: 20 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: { marginBottom: spacing.sm },
  setupName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  setupMeta: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginTop: 6,
  },
});
