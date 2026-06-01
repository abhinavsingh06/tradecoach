import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { WalletCard, accents, skins } from '../components/WalletCard';
import { useCoach } from '../hooks/useCoach';
import { useTradeStore } from '../store/tradeStore';
import { colors, radius, spacing } from '../utils/theme';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  { icon: 'pulse-outline' as const, text: 'What patterns do you see in my recent trades?' },
  { icon: 'flame-outline' as const, text: 'Am I trading on tilt? Be honest.' },
  { icon: 'trophy-outline' as const, text: 'Which setup is my best edge?' },
  { icon: 'shield-outline' as const, text: 'How do I size down after a loss?' },
  { icon: 'compass-outline' as const, text: 'Build me a checklist before each trade.' },
];

export const CoachScreen = () => {
  const { send, loading, messages, coachOffline } = useCoach();
  const clearMessages = useTradeStore((s) => s.clearMessages);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  const onSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput('');
    void send(value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.canvas} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* STICKY HEADER */}
        <View style={styles.stickyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Coach</Text>
            <Text style={styles.title}>Claude</Text>
            <Text style={styles.subtitle}>
              {coachOffline ? 'Not configured' : 'Reads your full journal'}
            </Text>
          </View>
          {messages.length ? (
            <Pressable
              onPress={() => clearMessages()}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Ionicons name="refresh" size={18} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>

        {messages.length === 0 ? (
          <View style={styles.intro}>
            {/* Hero card — what Claude does. */}
            <WalletCard
              skin={skins.violet}
              accent={accents.accent}
              elevated
              style={{ marginBottom: PAGE_GAP }}
            >
              <View style={styles.heroIcon}>
                <LinearGradient
                  colors={['#5B8DEF', '#7C5CFF', '#B794FF'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="sparkles" size={26} color={colors.white} />
              </View>
              <Text style={styles.introTitle}>Talk to your coach</Text>
              <Text style={styles.introText}>
                Claude reads every round trip, every journal note, and every
                emotion tag — then mirrors back what you&apos;re missing.
              </Text>
            </WalletCard>

            <SectionLabel>Try asking</SectionLabel>
            <WalletCard
              skin={skins.navy}
              accent={accents.neutral}
              padded={false}
            >
              {SUGGESTIONS.map((s, idx) => {
                const last = idx === SUGGESTIONS.length - 1;
                return (
                  <PressableScale
                    key={s.text}
                    onPress={() => onSend(s.text)}
                    scaleTo={0.99}
                  >
                    <View
                      style={[
                        styles.suggestion,
                        !last && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: 'rgba(255,255,255,0.06)',
                        },
                      ]}
                    >
                      <View style={styles.suggestionIcon}>
                        <Ionicons name={s.icon} size={15} color={colors.accent} />
                      </View>
                      <Text style={styles.suggestionText}>{s.text}</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.textMuted}
                      />
                    </View>
                  </PressableScale>
                );
              })}
            </WalletCard>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Bubble message={item} />}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {loading ? (
          <View style={styles.typing}>
            <TypingDots />
            <Text style={styles.typingText}>Coach is thinking…</Text>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.textMuted}
            style={styles.composerInput}
            multiline
            editable={!loading}
          />
          <Pressable
            onPress={() => onSend()}
            disabled={loading || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (loading || !input.trim()) && { opacity: 0.4 },
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
          >
            <LinearGradient
              colors={['#5B8DEF', '#7C5CFF', '#B794FF'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const PAGE_GAP = 12;

// ---------------------------------------------------------------------------

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionLabel}>{children}</Text>
  </View>
);

const Bubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowEnd : styles.bubbleRowStart,
      ]}
    >
      {isUser ? null : (
        <View style={styles.bubbleAvatar}>
          <Ionicons name="sparkles" size={11} color={colors.accent} />
        </View>
      )}
      <View
        style={[
          styles.bubbleWrap,
          isUser ? styles.bubbleWrapUser : styles.bubbleWrapCoach,
        ]}
      >
        <WalletCard
          skin={isUser ? skins.violet : skins.navy}
          accent={isUser ? accents.accent : accents.neutral}
          padded={false}
        >
          <View style={styles.bubble}>
            <Text style={[styles.bubbleText, isUser && { color: colors.text }]}>
              {message.content}
            </Text>
          </View>
        </WalletCard>
      </View>
    </View>
  );
};

const TypingDots = () => {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    animate(a, 0);
    animate(b, 160);
    animate(c, 320);
  }, [a, b, c]);

  const dot = (val: Animated.Value, key: string) => (
    <Animated.View
      key={key}
      style={[
        styles.dot,
        {
          transform: [
            {
              translateY: val.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -5],
              }),
            },
          ],
          opacity: val.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 1],
          }),
        },
      ]}
    />
  );

  return <View style={styles.dotsRow}>{[dot(a, 'a'), dot(b, 'b'), dot(c, 'c')]}</View>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06081A' },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#06081A',
  },

  // Sticky header
  stickyHeader: {
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#06081A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textDim,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Intro
  intro: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  introText: {
    fontSize: 14,
    color: colors.textDim,
    marginTop: 8,
    lineHeight: 21,
    letterSpacing: 0.05,
  },

  // Section
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textDim,
    textTransform: 'uppercase',
  },

  // Suggestion rows
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: 14,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    letterSpacing: -0.05,
    lineHeight: 19,
  },

  // Chat list
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  bubbleRowStart: { justifyContent: 'flex-start' },
  bubbleRowEnd: { justifyContent: 'flex-end' },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrap: { maxWidth: '82%' },
  bubbleWrapCoach: {},
  bubbleWrapUser: {},
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  bubbleText: {
    fontSize: 14.5,
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.05,
  },

  // Typing
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typingText: {
    fontSize: 12,
    color: colors.textDim,
    letterSpacing: 0.3,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,14,30,0.85)',
  },
  composerInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    maxHeight: 140,
    minHeight: 46,
    fontSize: 15,
    letterSpacing: -0.05,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
});

export default CoachScreen;
