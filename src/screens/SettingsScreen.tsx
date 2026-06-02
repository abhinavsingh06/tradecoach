import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { PaywallModal } from '../components/PaywallModal';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { buildExportTradesUrl } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { useAdminGrant, useLegalLinksQuery, useSubscriptionQuery } from '../hooks/useSubscription';
import { colors, radius, spacing } from '../utils/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const VERSION = '1.0.0';

export const SettingsScreen = (_props: Props) => {
  const { user, signOut, deleteAccount, entitlement, aiEnabled } = useAuth();
  const sub = useSubscriptionQuery();
  const grant = useAdminGrant();
  const links = useLegalLinksQuery();
  const [paywall, setPaywall] = useState(false);
  const isDev = __DEV__;

  const tierLabel = useMemo(() => {
    if (!aiEnabled) return 'Lite';
    if (!entitlement) return 'Free';
    if (entitlement.tier === 'pro') return 'Pro';
    if (entitlement.tier === 'trial') return 'Pro (Trial)';
    return 'Free';
  }, [entitlement, aiEnabled]);

  const onExportTrades = async () => {
    try {
      const url = await buildExportTradesUrl();
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Export failed',
        "Couldn't open the download. Make sure you have a recent signed-in session and try again.",
      );
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently erases your trades, journals, plans, mood, gates, voice memos, and subscription. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.canvas} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>Settings</Text>
          <Text style={styles.title}>Your account</Text>

          <WalletCard skin={skins.navy} accent={accents.neutral}>
            <Row label="Name" value={user?.name ?? '—'} />
            <Divider />
            <Row label="Email" value={user?.email ?? '—'} />
            <Divider />
            <Row label="Kite ID" value={user?.id ?? '—'} />
            <Divider />
            <Row label="Broker" value={user?.broker ?? '—'} />
          </WalletCard>

          <Text style={styles.section}>
            {aiEnabled ? 'Subscription' : 'App mode'}
          </Text>
          <WalletCard
            skin={!aiEnabled ? skins.navy : entitlement?.pro ? skins.violet : skins.navy}
            accent={!aiEnabled ? accents.neutral : entitlement?.pro ? accents.success : accents.accent}
            elevated
          >
            <View style={styles.subTop}>
              <Text style={styles.tierLabel}>{tierLabel}</Text>
              {aiEnabled && entitlement?.validUntil ? (
                <Text style={styles.tierExp}>
                  until {new Date(entitlement.validUntil).toLocaleDateString('en-IN')}
                </Text>
              ) : null}
            </View>
            {!aiEnabled ? (
              <Text style={styles.subBlurb}>
                Running in Lite mode — all journaling, cost analyzer, playbook, tax
                summary, mood check-ins, trading plans, and the rule-based pre-trade
                gate work fully. AI features are disabled in this build.
              </Text>
            ) : !entitlement?.pro ? (
              <Text style={styles.subBlurb}>
                Free includes cost analyzer, playbook, mood check-ins, tax summary,
                and rule-based pre-trade gates.
              </Text>
            ) : (
              <Text style={styles.subBlurb}>
                You have access to coach chat, AI gate refinement, voice journaling,
                identity reports, weekly narratives, and AI debriefs.
              </Text>
            )}

            {aiEnabled && sub.data?.buckets?.length ? (
              <View style={styles.usage}>
                <Text style={styles.usageHeader}>Today's usage</Text>
                {sub.data.buckets
                  .filter((b) => b.cap > 0)
                  .map((b) => (
                    <View key={b.bucket} style={styles.usageRow}>
                      <Text style={styles.usageLabel}>{b.description}</Text>
                      <Text style={styles.usageVal}>
                        {b.used} / {b.cap}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}

            {aiEnabled && !entitlement?.pro ? (
              <Button
                label="Upgrade to Pro"
                variant="gradient"
                onPress={() => setPaywall(true)}
                style={{ marginTop: spacing.md }}
              />
            ) : null}

            {aiEnabled && isDev ? (
              <Pressable onPress={() => grant.mutate()} style={styles.devBtn}>
                <Text style={styles.devBtnText}>
                  Dev: grant Pro (1 year)
                </Text>
              </Pressable>
            ) : null}
          </WalletCard>

          <Text style={styles.section}>Your data</Text>
          <WalletCard skin={skins.navy} accent={accents.neutral} padded={false}>
            <Pressable style={styles.link} onPress={onExportTrades}>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkText}>Export trades (CSV)</Text>
                <Text style={styles.linkSub}>
                  Full journal with estimated costs · for your CA, ITR, or
                  Excel
                </Text>
              </View>
              <Ionicons
                name="download-outline"
                size={18}
                color={colors.accent}
              />
            </Pressable>
          </WalletCard>

          <Text style={styles.section}>Legal & support</Text>
          <WalletCard skin={skins.navy} accent={accents.neutral} padded={false}>
            <Pressable
              style={styles.link}
              onPress={() => links.data && Linking.openURL(links.data.privacy)}
            >
              <Text style={styles.linkText}>Privacy policy</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Divider />
            <Pressable
              style={styles.link}
              onPress={() => links.data && Linking.openURL(links.data.terms)}
            >
              <Text style={styles.linkText}>Terms of use</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Divider />
            <Pressable
              style={styles.link}
              onPress={() => links.data && Linking.openURL(links.data.support)}
            >
              <Text style={styles.linkText}>Contact support</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </WalletCard>

          <Text style={styles.disclaimer}>
            TradeCoach is not a SEBI-registered investment adviser. AI coaching
            is informational, not financial advice. Trade at your own risk.
          </Text>

          <View style={styles.dangerActions}>
            <Button label="Sign out" variant="secondary" onPress={signOut} />
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete account</Text>
            </Pressable>
          </View>

          <Text style={styles.version}>TradeCoach v{VERSION}</Text>
        </ScrollView>
      </SafeAreaView>

      <PaywallModal visible={paywall} onClose={() => setPaywall(false)} />
    </View>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

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
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  rowValue: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  subTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierLabel: { fontSize: 22, fontWeight: '800', color: '#fff' },
  tierExp: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  subBlurb: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19 },
  usage: { marginTop: spacing.md, gap: 6 },
  usageHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  usageVal: { fontSize: 12, color: '#fff', fontWeight: '600' },
  devBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  devBtnText: { fontSize: 12, color: colors.warning, fontWeight: '700' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  linkText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  linkTextWrap: { flex: 1 },
  linkSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  dangerActions: { gap: spacing.sm, marginTop: spacing.lg },
  deleteBtn: { paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  version: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
