import { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatInr, formatInrPlain } from '../utils/currency';

interface Props {
  value: number;
  /** Total animation duration in ms. */
  duration?: number;
  /** When true (default), shows ₹ + sign + grouping. */
  formatted?: boolean;
  withSign?: boolean;
  style?: TextStyle | TextStyle[];
  prefix?: string;
  suffix?: string;
}

/**
 * Smoothly animates a numeric value to a new target. Uses requestAnimationFrame
 * for native-like ease-out without bringing in reanimated.
 */
export const AnimatedCounter = ({
  value,
  duration = 800,
  formatted = true,
  withSign = true,
  style,
  prefix,
  suffix,
}: Props) => {
  const [current, setCurrent] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<{ from: number; ts: number } | null>(null);

  useEffect(() => {
    startRef.current = { from: current, ts: performance.now() };
    const animate = (now: number) => {
      if (!startRef.current) return;
      const elapsed = now - startRef.current.ts;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = startRef.current.from + (value - startRef.current.from) * eased;
      setCurrent(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const display = formatted
    ? withSign
      ? formatInr(current)
      : formatInrPlain(current)
    : Math.round(current).toString();

  return (
    <Text style={style}>
      {prefix}
      {display}
      {suffix}
    </Text>
  );
};

export default AnimatedCounter;
