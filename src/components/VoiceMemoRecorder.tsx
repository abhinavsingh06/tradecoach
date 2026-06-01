import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useVoiceTranscribe } from '../hooks/useFeatures';
import { EMOTIONS, SETUPS, type Emotion, type Setup } from '../types';
import { colors, radius, spacing } from '../utils/theme';

type Props = {
  tradeId: string;
  onStructured?: (data: {
    emotion: Emotion | null;
    setup: Setup | null;
    notes: string;
  }) => void;
};

export const VoiceMemoRecorder = ({ tradeId, onStructured }: Props) => {
  const transcribe = useVoiceTranscribe();
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    void Audio.requestPermissionsAsync().then(({ granted }) =>
      setPermission(granted),
    );
  }, []);

  const start = async () => {
    if (!permission) {
      Alert.alert('Microphone', 'Allow microphone access to record voice memos.');
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recRef.current = rec;
    setRecording(true);
  };

  const stop = async () => {
    const rec = recRef.current;
    if (!rec) return;
    setRecording(false);
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    const status = await rec.getStatusAsync();
    recRef.current = null;
    if (!uri) return;
    try {
      const { memo } = await transcribe.mutateAsync({
        uri,
        roundTripId: tradeId,
        durationMs: status.durationMillis ?? undefined,
        structure: true,
      });
      if (memo.structured && onStructured) {
        const e = memo.structured.emotion;
        const s = memo.structured.setup;
        onStructured({
          emotion:
            e && EMOTIONS.includes(e as Emotion) ? (e as Emotion) : null,
          setup: s && SETUPS.includes(s as Setup) ? (s as Setup) : null,
          notes: memo.structured.notes ?? memo.transcript ?? '',
        });
      } else if (memo.transcript && onStructured) {
        onStructured({ emotion: null, setup: null, notes: memo.transcript });
      }
    } catch (e) {
      Alert.alert(
        'Transcription failed',
        e instanceof Error ? e.message : 'Check OPENAI_API_KEY on server',
      );
    }
  };

  return (
    <Pressable
      onPress={recording ? stop : start}
      style={[styles.btn, recording && styles.btnRec]}
      disabled={transcribe.isPending}
    >
      {transcribe.isPending ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <Ionicons
          name={recording ? 'stop-circle' : 'mic'}
          size={20}
          color={recording ? colors.danger : colors.accent}
        />
      )}
      <Text style={styles.label}>
        {transcribe.isPending
          ? 'Transcribing…'
          : recording
            ? 'Tap to stop'
            : 'Voice journal'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  btnRec: { backgroundColor: 'rgba(239,68,68,0.15)' },
  label: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
