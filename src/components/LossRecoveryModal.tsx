import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from './Button';
import { WalletCard, accents, skins } from './WalletCard';
import {
  useActiveRecoveryQuery,
  useRecoveryStep,
  useStartRecovery,
} from '../hooks/useFeatures';
import type { LossRecovery } from '../types';
import { colors, radius, spacing } from '../utils/theme';

const COOLDOWN_MS = 15 * 60 * 1000;

type Props = {
  visible: boolean;
  onClose: () => void;
  triggerPnl?: number;
};

export const LossRecoveryModal = ({
  visible,
  onClose,
  triggerPnl,
}: Props) => {
  const activeQ = useActiveRecoveryQuery();
  const start = useStartRecovery();
  const step = useRecoveryStep();
  const [reflection, setReflection] = useState('');
  const [remaining, setRemaining] = useState(0);

  const recovery: LossRecovery | null | undefined =
    activeQ.data?.recovery ?? null;

  useEffect(() => {
    if (!recovery?.cooldownStartedAt || recovery.cooldownCompletedAt) {
      setRemaining(0);
      return;
    }
    const end =
      new Date(recovery.cooldownStartedAt).getTime() + COOLDOWN_MS;
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [recovery?.cooldownStartedAt, recovery?.cooldownCompletedAt]);

  const ensureStarted = async () => {
    if (recovery) return recovery;
    const { recovery: r } = await start.mutateAsync({
      triggerReason: 'manual',
      triggerPnl,
    });
    return r;
  };

  const doStep = async (
    s: 'closedPositions' | 'reflection' | 'startCooldown' | 'tomorrowPlan',
    extra?: { reflection?: string },
  ) => {
    const r = await ensureStarted();
    await step.mutateAsync({ id: r.id, step: s, ...extra });
    if (s === 'tomorrowPlan') onClose();
  };

  const mins = Math.ceil(remaining / 60000);
  const secs = Math.ceil((remaining % 60000) / 1000);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Loss recovery</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textDim} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <WalletCard skin={skins.danger} accent={accents.danger} elevated>
            <Text style={styles.kicker}>4-step protocol</Text>
            <Text style={styles.lead}>
              Close risk → reflect → cool down → plan tomorrow. No shortcuts.
            </Text>

            <Step
              n={1}
              label="Close all positions"
              done={!!recovery?.closedPositionsAt}
              onPress={() => doStep('closedPositions')}
            />
            <Step
              n={2}
              label="Written reflection (30+ chars)"
              done={!!recovery?.writtenReflectionAt}
              active={!!recovery?.closedPositionsAt && !recovery?.writtenReflectionAt}
            />
            {recovery?.closedPositionsAt && !recovery?.writtenReflectionAt ? (
              <>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder="What happened? What will you do differently?"
                  placeholderTextColor={colors.textMuted}
                  value={reflection}
                  onChangeText={setReflection}
                />
                <Button
                  label="Submit reflection"
                  variant="gradient"
                  onPress={() =>
                    doStep('reflection', { reflection: reflection.trim() })
                  }
                  disabled={reflection.trim().length < 30}
                />
              </>
            ) : null}
            <Step
              n={3}
              label="15-minute cooldown"
              done={!!recovery?.cooldownCompletedAt}
              active={
                !!recovery?.writtenReflectionAt && !recovery?.cooldownStartedAt
              }
              onPress={() => doStep('startCooldown')}
              extra={
                recovery?.cooldownStartedAt && !recovery?.cooldownCompletedAt
                  ? `${mins}:${secs.toString().padStart(2, '0')} left`
                  : undefined
              }
            />
            <Step
              n={4}
              label="Set tomorrow's plan"
              done={!!recovery?.tomorrowPlanSetAt}
              active={
                !!recovery?.cooldownStartedAt &&
                remaining === 0 &&
                !recovery?.tomorrowPlanSetAt
              }
              onPress={() => doStep('tomorrowPlan')}
            />
          </WalletCard>
        </View>
      </View>
    </Modal>
  );
};

const Step = ({
  n,
  label,
  done,
  active,
  onPress,
  extra,
}: {
  n: number;
  label: string;
  done?: boolean;
  active?: boolean;
  onPress?: () => void;
  extra?: string;
}) => (
  <Pressable
    onPress={active ? onPress : undefined}
    style={[styles.step, done && styles.stepDone, active && styles.stepActive]}
    disabled={!active || done}
  >
    <View style={[styles.stepNum, done && styles.stepNumDone]}>
      {done ? (
        <Ionicons name="checkmark" size={14} color="#0a0e1e" />
      ) : (
        <Text style={styles.stepNumText}>{n}</Text>
      )}
    </View>
    <Text style={styles.stepLabel}>{label}</Text>
    {extra ? <Text style={styles.stepExtra}>{extra}</Text> : null}
  </Pressable>
);

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
  body: { padding: spacing.lg },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
  },
  lead: { color: 'rgba(255,255,255,0.8)', marginBottom: spacing.md, lineHeight: 20 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  stepDone: { opacity: 0.7 },
  stepActive: { opacity: 1 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: { backgroundColor: colors.success },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepLabel: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
  stepExtra: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    marginVertical: spacing.sm,
    textAlignVertical: 'top',
  },
});
