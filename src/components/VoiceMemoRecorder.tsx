import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useVoiceTranscribe } from '../hooks/useFeatures';
import { EMOTIONS, SETUPS, type Emotion, type Setup } from '../types';
import { colors, radius, spacing } from '../utils/theme';

interface Props {
  tradeId: string;
  onStructured?: (data: {
    emotion: Emotion | null;
    setup: Setup | null;
    notes: string;
  }) => void;
}

/**
 * Tap to record a voice memo, tap again to stop. The clip is uploaded to the
 * backend, transcribed with Whisper, and (optionally) parsed into
 * {emotion, setup, notes} which the parent journal form can pre-fill.
 *
 * Built on `expo-audio` (SDK 56+). The previous `expo-av` API was removed.
 */
export const VoiceMemoRecorder = ({ tradeId, onStructured }: Props) => {
  const transcribe = useVoiceTranscribe();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!cancelled) setPermission(granted);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = async () => {
    if (!permission) {
      Alert.alert(
        'Microphone',
        'Allow microphone access to record voice memos.',
      );
      return;
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAtRef.current = Date.now();
    setRecording(true);
  };

  const stop = async () => {
    if (!recorder.isRecording) return;
    setRecording(false);

    await recorder.stop();
    const uri = recorder.uri;
    const durationMs = startedAtRef.current
      ? Date.now() - startedAtRef.current
      : undefined;
    startedAtRef.current = null;

    if (!uri) return;

    try {
      const { memo } = await transcribe.mutateAsync({
        uri,
        roundTripId: tradeId,
        durationMs,
        structure: true,
      });

      if (!onStructured) return;

      if (memo.structured) {
        const { emotion, setup, notes } = memo.structured;
        onStructured({
          emotion:
            emotion && EMOTIONS.includes(emotion as Emotion)
              ? (emotion as Emotion)
              : null,
          setup:
            setup && SETUPS.includes(setup as Setup) ? (setup as Setup) : null,
          notes: notes ?? memo.transcript ?? '',
        });
      } else if (memo.transcript) {
        onStructured({ emotion: null, setup: null, notes: memo.transcript });
      }
    } catch (e) {
      Alert.alert(
        'Transcription failed',
        e instanceof Error ? e.message : 'Please try again later.',
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
