import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { WalletCard, accents, skins } from './WalletCard';
import { useMoodTodayQuery, useSaveMood } from '../hooks/useFeatures';
import { colors, radius, spacing } from '../utils/theme';

const Slider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) => (
  <View style={styles.sliderBlock}>
    <Text style={styles.sliderLabel}>
      {label} · {value}/5
    </Text>
    <View style={styles.sliderRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          style={[styles.dot, n <= value && styles.dotOn]}
        />
      ))}
    </View>
  </View>
);

export const MoodCheckinCard = () => {
  const moodQ = useMoodTodayQuery();
  const save = useSaveMood();
  const [expanded, setExpanded] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [focus, setFocus] = useState(3);
  const [sleep, setSleep] = useState('7');
  const [note, setNote] = useState('');

  const done = !!moodQ.data?.mood;

  useEffect(() => {
    const m = moodQ.data?.mood;
    if (!m) return;
    if (m.energy != null) setEnergy(m.energy);
    if (m.stress != null) setStress(m.stress);
    if (m.focus != null) setFocus(m.focus);
    if (m.sleepHours != null) setSleep(String(m.sleepHours));
    if (m.note) setNote(m.note);
  }, [moodQ.data?.mood?.id]);

  const onSave = async () => {
    const sleepHours = parseFloat(sleep);
    await save.mutateAsync({
      sleepHours: Number.isFinite(sleepHours) ? sleepHours : null,
      energy,
      stress,
      focus,
      note: note.trim() || null,
    });
    setExpanded(false);
  };

  return (
    <WalletCard
      skin={skins.violet}
      accent={done ? accents.success : accents.accent}
      onPress={() => setExpanded((e) => !e)}
    >
      <View style={styles.top}>
        <Ionicons name="moon-outline" size={18} color={colors.accent} />
        <Text style={styles.kicker}>Morning pulse</Text>
        {done ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Logged</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>
        {done ? 'Mood logged for today' : '30-second check-in'}
      </Text>
      <Text style={styles.sub}>
        {done
          ? 'We correlate sleep & stress with your P&L over time.'
          : 'Sleep, energy, stress — unlocks your personal edge map.'}
      </Text>

      {expanded ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Sleep (hours)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={sleep}
            onChangeText={setSleep}
            placeholder="7"
            placeholderTextColor={colors.textMuted}
          />
          <Slider label="Energy" value={energy} onChange={setEnergy} />
          <Slider label="Stress" value={stress} onChange={setStress} />
          <Slider label="Focus" value={focus} onChange={setFocus} />
          <TextInput
            style={[styles.input, styles.note]}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
          <Pressable
            onPress={onSave}
            style={styles.saveBtn}
            disabled={save.isPending}
          >
            <Text style={styles.saveBtnText}>
              {save.isPending ? 'Saving…' : 'Save check-in'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </WalletCard>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  kicker: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(52,211,153,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.success },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  form: { marginTop: spacing.md, gap: spacing.sm },
  fieldLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  note: { minHeight: 48 },
  sliderBlock: { marginTop: 4 },
  sliderLabel: { fontSize: 12, color: colors.textDim, marginBottom: 6 },
  sliderRow: { flexDirection: 'row', gap: 8 },
  dot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotOn: { backgroundColor: colors.accent },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontWeight: '700', color: '#0a0e1e' },
});
