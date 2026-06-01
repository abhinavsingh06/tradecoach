import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { WalletCard, accents, skins } from './WalletCard';
import {
  useStartCheckout,
  useStartTrial,
  useSubscriptionQuery,
} from '../hooks/useSubscription';
import { colors, radius, spacing } from '../utils/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  feature?: string;
};

const BENEFITS = [
  { icon: 'sparkles', label: 'Unlimited coach chat' },
  { icon: 'shield-checkmark', label: 'AI-refined pre-trade gate' },
  { icon: 'mic', label: 'Voice journaling with auto-tagging' },
  { icon: 'pulse', label: 'Identity report & weekly narrative' },
  { icon: 'moon', label: 'AI end-of-day debriefs' },
  { icon: 'flash', label: 'Higher daily limits everywhere' },
] as const;

export const PaywallModal = ({ visible, onClose, feature }: Props) => {
  const sub = useSubscriptionQuery();
  const trial = useStartTrial();
  const checkout = useStartCheckout();

  const price = sub.data?.proPriceInr ?? 299;
  const trialDays = sub.data?.trialDays ?? 14;
  const trialUsed = sub.data?.entitlement.source === 'trial';

  const onTrial = async () => {
    try {
      const { started } = await trial.mutateAsync();
      if (started) {
        Alert.alert('Trial started', `Pro unlocked for ${trialDays} days.`);
        onClose();
      } else {
        Alert.alert(
          'Trial already used',
          'You can subscribe once payments are live.',
        );
      }
    } catch (e) {
      Alert.alert(
        'Could not start trial',
        e instanceof Error ? e.message : 'Try again later.',
      );
    }
  };

  const onSubscribe = async () => {
    try {
      const r = await checkout.mutateAsync();
      Alert.alert('Subscribe', r.message);
    } catch (e) {
      Alert.alert(
        'Checkout',
        e instanceof Error ? e.message : 'Not available yet.',
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>TradeCoach Pro</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textDim} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <WalletCard skin={skins.violet} accent={accents.accent} elevated>
            {feature ? (
              <Text style={styles.featureNote}>
                {feature} is a Pro feature.
              </Text>
            ) : null}
            <Text style={styles.priceLead}>
              ₹{price}
              <Text style={styles.priceUnit}>/month</Text>
            </Text>
            <Text style={styles.priceSub}>
              Less than the cost of one trade. Cancel anytime.
            </Text>
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b.label} style={styles.benefit}>
                  <Ionicons name={b.icon} size={16} color={colors.accent} />
                  <Text style={styles.benefitText}>{b.label}</Text>
                </View>
              ))}
            </View>
          </WalletCard>

          <View style={styles.actions}>
            {!trialUsed ? (
              <Button
                label={
                  trial.isPending ? 'Starting…' : `Start ${trialDays}-day free trial`
                }
                onPress={onTrial}
                variant="gradient"
                disabled={trial.isPending}
              />
            ) : null}
            <Button
              label={checkout.isPending ? 'Loading…' : 'Subscribe'}
              onPress={onSubscribe}
              variant="secondary"
              disabled={checkout.isPending}
            />
            <Text style={styles.fine}>
              Payments coming soon. Free trial is available now.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { padding: spacing.lg, gap: spacing.lg },
  featureNote: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  priceLead: { fontSize: 44, fontWeight: '800', color: '#fff' },
  priceUnit: { fontSize: 18, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  priceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.lg },
  benefits: { gap: 10, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  actions: { gap: spacing.sm },
  fine: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
});
