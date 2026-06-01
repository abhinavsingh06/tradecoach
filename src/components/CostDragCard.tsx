import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { WalletCard, accents, skins } from './WalletCard';
import { useCostsQuery } from '../hooks/useFeatures';
import { formatInr, formatInrPlain } from '../utils/currency';
import { colors } from '../utils/theme';

export const CostDragCard = () => {
  const { data } = useCostsQuery();
  // Same window as Insights → "Cost drag (30d)" so Today and Report always
  // show identical numbers. (thisMonth is still returned for future use.)
  const period = data?.last30Days;
  if (!period || period.trades === 0) return null;

  const drag = period.costDragPct;

  return (
    <WalletCard skin={skins.navy} accent={accents.warning}>
      <View style={styles.top}>
        <Ionicons name="receipt-outline" size={18} color={colors.warning} />
        <Text style={styles.kicker}>Cost drag · 30d</Text>
      </View>
      <Text style={styles.title}>
        {formatInrPlain(period.estimatedCosts)} in fees
      </Text>
      <Text style={styles.sub}>
        Gross {formatInr(period.grossPnl)} → net {formatInr(period.netPnl)}.
        {drag > 0 ? ` Costs ate ${drag.toFixed(0)}% of gross.` : ''}
      </Text>
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, drag)}%` as `${number}%` },
            ]}
          />
        </View>
        <Text style={styles.barLabel}>STT + brokerage (est.)</Text>
      </View>
    </WalletCard>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  barRow: { marginTop: 12 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.warning, borderRadius: 3 },
  barLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
