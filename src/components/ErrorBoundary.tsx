import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../utils/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary. Production React Native crashes that bubble out of
 * the render tree would otherwise show a white screen; we render a recoverable
 * fallback and log the error for the next launch / crash reporter.
 *
 * In `__DEV__` we surface the message + stack so the bug is obvious during
 * development. In production we keep the UI calm and offer a "Try again" CTA.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Wire this up to Sentry / Bugsnag when we ship one.
    console.error('[TradeCoach] Uncaught error in render tree:', error, info);
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            We hit an unexpected problem. Tap retry, or restart the app if it
            keeps happening.
          </Text>
          {__DEV__ ? (
            <View style={styles.devBox}>
              <Text style={styles.devLabel}>DEV ONLY</Text>
              <Text style={styles.devMsg}>{error.message}</Text>
              {error.stack ? (
                <Text style={styles.devStack}>{error.stack}</Text>
              ) : null}
            </View>
          ) : null}
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [
              styles.cta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.ctaText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
  },
  devBox: {
    backgroundColor: colors.dangerDim,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  devLabel: {
    ...typography.caption,
    color: colors.danger,
    textTransform: 'uppercase',
  },
  devMsg: { ...typography.bodyBold, color: colors.text },
  devStack: { ...typography.small, color: colors.textDim },
  cta: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  ctaText: { ...typography.bodyBold, color: colors.white },
});

export default ErrorBoundary;
