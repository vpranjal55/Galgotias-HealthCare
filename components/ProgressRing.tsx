import React from 'react';
import { View } from 'react-native';
import { colors } from '../lib/theme';

interface RingProps {
  size?: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/**
 * Dependency-free progress ring (two rotated half-rings clipped to each half),
 * so it renders identically on Android, iOS and web without react-native-svg.
 */
export function ProgressRing({
  size = 120,
  stroke = 12,
  progress,
  color = colors.maroon,
  track = colors.track,
  children,
}: RingProps) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const half = size / 2;
  const deg = p * 360;
  const circle = { position: 'absolute' as const, top: 0, width: size, height: size, borderRadius: half, borderWidth: stroke };
  const rightRot = p <= 0.5 ? deg - 135 : 45;
  const leftRot = deg - 315;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ ...circle, left: 0, borderColor: track }} />
      {p > 0 ? (
        <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
          <View
            style={{
              ...circle,
              left: -half,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${rightRot}deg` }],
            }}
          />
        </View>
      ) : null}
      {p > 0.5 ? (
        <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
          <View
            style={{
              ...circle,
              left: 0,
              borderColor: 'transparent',
              borderBottomColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${leftRot}deg` }],
            }}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface RingSpec {
  progress: number;
  color: string;
}

/** Concentric activity rings (outermost first). */
export function ActivityRings({
  rings,
  size = 190,
  stroke = 14,
  gap = 6,
  track = colors.track,
  children,
}: {
  rings: RingSpec[];
  size?: number;
  stroke?: number;
  gap?: number;
  track?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((r, i) => {
        const d = size - i * 2 * (stroke + gap);
        return (
          <View key={i} style={{ position: 'absolute' }}>
            <ProgressRing size={d} stroke={stroke} progress={r.progress} color={r.color} track={track} />
          </View>
        );
      })}
      {children}
    </View>
  );
}
