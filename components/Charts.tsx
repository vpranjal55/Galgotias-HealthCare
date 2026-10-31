import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

/** Rounded "pill" columns with a hatched track — activity tracker style. */
export function PillBars({
  data,
  selected,
  onSelect,
  color = colors.maroon,
  height = 190,
}: {
  data: BarDatum[];
  selected?: string;
  onSelect?: (key: string) => void;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.row}>
      {data.map((d) => {
        const on = d.key === selected;
        const h = d.value > 0 ? Math.max(26, Math.round((d.value / max) * height)) : 0;
        return (
          <Pressable key={d.key} onPress={() => onSelect?.(d.key)} style={styles.col}>
            <View style={[styles.track, { height }, on && styles.trackOn]}>
              {h > 0 ? (
                <View style={[styles.fill, { height: h, backgroundColor: color }]}>
                  <View style={styles.dot} />
                </View>
              ) : null}
            </View>
            <Text style={[styles.lbl, on && styles.lblOn]}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface TrendDatum {
  key: string;
  label: string;
  a: number;
  b: number;
}

/** Paired thin bars (e.g. mental vs physical) per day. */
export function TrendBars({
  data,
  selected,
  onSelect,
  height = 150,
  aColor = colors.maroon,
  bColor = colors.navy,
}: {
  data: TrendDatum[];
  selected?: string;
  onSelect?: (key: string) => void;
  height?: number;
  aColor?: string;
  bColor?: string;
}) {
  return (
    <View style={styles.row}>
      {data.map((d) => {
        const on = d.key === selected;
        return (
          <Pressable key={d.key} onPress={() => onSelect?.(d.key)} style={[styles.col, on && styles.trendOn]}>
            <View style={[styles.pair, { height }]}>
              <View style={[styles.thin, { height: Math.max(6, (d.a / 100) * height), backgroundColor: aColor }]} />
              <View style={[styles.thin, { height: Math.max(6, (d.b / 100) * height), backgroundColor: bColor }]} />
            </View>
            <Text style={[styles.lbl, on && styles.lblOn]}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface DayChip {
  key: string;
  top: string;
  bottom: string;
  hasData?: boolean;
}

export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: DayChip[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {days.map((d) => {
        const on = d.key === selected;
        return (
          <Pressable key={d.key} onPress={() => onSelect(d.key)} style={[styles.day, on && styles.dayOn]}>
            <Text style={[styles.dayTop, on && styles.dayTextOn]}>{d.top}</Text>
            <Text style={[styles.dayBottom, on && styles.dayTextOn]}>{d.bottom}</Text>
            <View style={[styles.pip, { backgroundColor: d.hasData ? (on ? colors.gold : colors.maroon) : 'transparent' }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Dark summary bubble used above charts, like the tooltip in the reference. */
export function ChartTip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 18 },
  track: {
    width: '78%',
    maxWidth: 44,
    borderRadius: 999,
    backgroundColor: colors.creamDark,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trackOn: { borderColor: colors.navy },
  fill: { width: '100%', borderRadius: 999, alignItems: 'center', paddingTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  lbl: { marginTop: 8, fontSize: 11, color: colors.muted, fontWeight: '700' },
  lblOn: { color: colors.navy },
  trendOn: { backgroundColor: colors.maroonTint },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  thin: { width: 7, borderRadius: 4 },
  strip: { gap: 8, paddingVertical: 4 },
  day: {
    minWidth: 58,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  dayTop: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  dayBottom: { fontSize: 18, color: colors.navy, fontWeight: '800', marginTop: 2 },
  dayTextOn: { color: colors.white },
  pip: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  tip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  tipText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
