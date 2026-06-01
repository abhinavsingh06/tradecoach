import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from './Button';
import { PaywallModal } from './PaywallModal';
import { Pill } from './Pill';
import { WalletCard, accents, skins } from './WalletCard';
import { ApiError } from '../api/client';
import { useGateAction, usePreTradeGate } from '../hooks/useFeatures';
import { SETUPS, type GateVerdict, type PreTradeGateResult } from '../types';
import { formatInrPlain } from '../utils/currency';
import { colors, radius, spacing } from '../utils/theme';

const verdictSkin = (v: GateVerdict) => {
  if (v === 'green') return { skin: skins.navy, accent: accents.success };
  if (v === 'yellow') return { skin: skins.warning, accent: accents.warning };
  return { skin: skins.danger, accent: accents.danger };
};

const verdictLabel = (v: GateVerdict) =>
  v === 'green' ? 'GO' : v === 'yellow' ? 'CAUTION' : 'STOP';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const PreTradeGateModal = ({ visible, onClose }: Props) => {
  const gateMut = usePreTradeGate();
  const actionMut = useGateAction();
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [setup, setSetup] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [conviction, setConviction] = useState(7);
  const [result, setResult] = useState<PreTradeGateResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // --- Position size calculator (Tier-B) -------------------------------------
  // Inputs are kept as raw strings so the user can clear them and re-type.
  const [accountSize, setAccountSize] = useState('');
  const [riskPct, setRiskPct] = useState('1');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');

  const positionSize = (() => {
    const acct = Number(accountSize.replace(/,/g, ''));
    const risk = Number(riskPct);
    const e = Number(entry);
    const s = Number(stop);
    if (!Number.isFinite(acct) || acct <= 0) return null;
    if (!Number.isFinite(risk) || risk <= 0 || risk > 100) return null;
    if (!Number.isFinite(e) || e <= 0) return null;
    if (!Number.isFinite(s) || s <= 0) return null;
    const riskPerShare = Math.abs(e - s);
    if (riskPerShare <= 0) return null;
    const riskRupees = acct * (risk / 100);
    const qty = Math.floor(riskRupees / riskPerShare);
    if (qty <= 0) return null;
    const notional = qty * e;
    const exposurePct = (notional / acct) * 100;
    return {
      qty,
      riskRupees: Math.round(riskRupees),
      notional: Math.round(notional),
      exposurePct,
      riskPerShare,
    };
  })();

  const reset = () => {
    setResult(null);
    setSymbol('');
    setReason('');
    setSetup(null);
    setConviction(7);
    setEntry('');
    setStop('');
  };

  const onCheck = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    try {
      const { gate } = await gateMut.mutateAsync({
        tradingsymbol: sym,
        side,
        setup,
        reason: reason.trim() || null,
        conviction,
      });
      setResult(gate);
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.code === 'pro_required' || e.code === 'daily_quota_exceeded')
      ) {
        // Only show paywall when the server actually has AI configured.
        // In Lite mode this code path is unreachable (server still returns
        // rules-based verdicts within the free cap).
        setShowPaywall(true);
      }
    }
  };

  const onAction = async (action: 'took' | 'skipped') => {
    if (!result) return;
    await actionMut.mutateAsync({ gateId: result.id, action });
    reset();
    onClose();
  };

  const { skin, accent } = result
    ? verdictSkin(result.verdict)
    : { skin: skins.violet, accent: accents.accent };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Pre-trade gate</Text>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textDim} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!result ? (
            <>
              <Text style={styles.hint}>
                Before you fire the order — check discipline, tilt, and your
                history on this symbol.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Symbol (e.g. NIFTY26JUNFUT)"
                placeholderTextColor={colors.textMuted}
                value={symbol}
                onChangeText={setSymbol}
                autoCapitalize="characters"
              />
              <View style={styles.row}>
                <Pill
                  label="Long"
                  selected={side === 'long'}
                  onPress={() => setSide('long')}
                />
                <Pill
                  label="Short"
                  selected={side === 'short'}
                  onPress={() => setSide('short')}
                />
              </View>
              <Text style={styles.label}>Setup (optional)</Text>
              <View style={styles.wrap}>
                {SETUPS.map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    selected={setup === s}
                    onPress={() => setSetup(setup === s ? null : s)}
                  />
                ))}
              </View>
              <Text style={styles.label}>Why this trade?</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="One line — what’s the edge?"
                placeholderTextColor={colors.textMuted}
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Text style={styles.label}>Conviction: {conviction}/10</Text>
              <View style={styles.convictionRow}>
                {[3, 5, 7, 9].map((n) => (
                  <Pill
                    key={n}
                    label={String(n)}
                    selected={conviction === n}
                    onPress={() => setConviction(n)}
                  />
                ))}
              </View>

              {/* Position size calculator — completely client-side. */}
              <View style={styles.posCard}>
                <View style={styles.posHeader}>
                  <Ionicons
                    name="calculator-outline"
                    size={14}
                    color={colors.accent}
                  />
                  <Text style={styles.posKicker}>Position size</Text>
                </View>
                <View style={styles.posRow}>
                  <View style={styles.posField}>
                    <Text style={styles.posLabel}>Account ₹</Text>
                    <TextInput
                      style={styles.posInput}
                      placeholder="100000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={accountSize}
                      onChangeText={setAccountSize}
                    />
                  </View>
                  <View style={styles.posField}>
                    <Text style={styles.posLabel}>Risk %</Text>
                    <TextInput
                      style={styles.posInput}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={riskPct}
                      onChangeText={setRiskPct}
                    />
                  </View>
                </View>
                <View style={styles.posRow}>
                  <View style={styles.posField}>
                    <Text style={styles.posLabel}>Entry</Text>
                    <TextInput
                      style={styles.posInput}
                      placeholder="250"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={entry}
                      onChangeText={setEntry}
                    />
                  </View>
                  <View style={styles.posField}>
                    <Text style={styles.posLabel}>Stop</Text>
                    <TextInput
                      style={styles.posInput}
                      placeholder="245"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={stop}
                      onChangeText={setStop}
                    />
                  </View>
                </View>
                {positionSize ? (
                  <View style={styles.posResult}>
                    <View style={styles.posResultMain}>
                      <Text style={styles.posResultLabel}>Max quantity</Text>
                      <Text style={styles.posResultQty}>
                        {positionSize.qty.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Text style={styles.posResultSub}>
                      Risk{' '}
                      <Text style={styles.posResultStrong}>
                        {formatInrPlain(positionSize.riskRupees)}
                      </Text>{' '}
                      · Notional{' '}
                      <Text style={styles.posResultStrong}>
                        {formatInrPlain(positionSize.notional)}
                      </Text>{' '}
                      ({positionSize.exposurePct.toFixed(1)}% of account)
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.posHint}>
                    Enter account size, risk %, entry, and stop to compute the
                    largest position that respects your max-loss rule.
                  </Text>
                )}
              </View>

              <Button
                label={gateMut.isPending ? 'Checking…' : 'Run gate'}
                onPress={onCheck}
                disabled={gateMut.isPending || !symbol.trim()}
                variant="gradient"
              />
            </>
          ) : (
            <WalletCard skin={skin} accent={accent} elevated>
              <Text style={styles.verdictKicker}>
                {verdictLabel(result.verdict)}
              </Text>
              <Text style={styles.verdictMsg}>{result.message}</Text>
              <View style={styles.actions}>
                {result.verdict !== 'green' ? (
                  <Button
                    label="I'll skip"
                    variant="secondary"
                    onPress={() => onAction('skipped')}
                  />
                ) : null}
                <Button
                  label="Taking it anyway"
                  variant={result.verdict === 'red' ? 'secondary' : 'gradient'}
                  onPress={() => onAction('took')}
                />
              </View>
            </WalletCard>
          )}
          {gateMut.isPending ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          ) : null}
        </ScrollView>
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Pre-trade gate"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  hint: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  convictionRow: { flexDirection: 'row', gap: spacing.sm },
  verdictKicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  verdictMsg: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  actions: { gap: spacing.sm },

  // Position size calculator
  posCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  posHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  posKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  posRow: { flexDirection: 'row', gap: spacing.sm },
  posField: { flex: 1 },
  posLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  posInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  posResult: {
    marginTop: 4,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  posResultMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  posResultLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  posResultQty: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  posResultSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    lineHeight: 18,
  },
  posResultStrong: { color: '#fff', fontWeight: '700' },
  posHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
