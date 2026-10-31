import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout } from '../lib/theme';
import { useLayout } from '../lib/useLayout';

/** Scrollable, centred, max-width page shell used by every dashboard screen. */
export function Page({
  children,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { wide } = useLayout();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: wide ? 28 : 16 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Fixed header + virtualised list screens: constrains width and pads like <Page>. */
export function ListShell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const { wide } = useLayout();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.listOuter}>
        <View style={[styles.listInner, { paddingHorizontal: wide ? 28 : 16 }]}>{header}</View>
        <View style={[styles.listInner, { flex: 1 }]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Responsive column layout.
 *  - phone: one stacked column
 *  - tablet / small desktop: first child | remaining children stacked
 *  - large desktop: every child gets its own column
 */
export function Cols({
  children,
  ratios = [1.2, 1.1, 0.95],
  gap = 16,
}: {
  children: React.ReactNode;
  ratios?: number[];
  gap?: number;
}) {
  const { columns } = useLayout();
  const items = React.Children.toArray(children);
  if (columns === 1 || items.length < 2) {
    return (
      <View style={{ gap }}>
        {items.map((c, i) => (
          <View key={i} style={{ gap }}>
            {c}
          </View>
        ))}
      </View>
    );
  }
  if (columns === 2 && items.length > 2) {
    return (
      <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
        <View style={{ flex: 1.1, minWidth: 0, gap }}>{items[0]}</View>
        <View style={{ flex: 1, minWidth: 0, gap }}>{items.slice(1)}</View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
      {items.map((c, i) => (
        <View key={i} style={{ flex: ratios[i] ?? 1, minWidth: 0, gap }}>
          {c}
        </View>
      ))}
    </View>
  );
}

/** Horizontal row of equal tiles that wraps on very small screens. */
export function TileRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap: 10 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { alignItems: 'center', paddingBottom: 48 },
  inner: { width: '100%', maxWidth: layout.maxContent, gap: 16 },
  listOuter: { flex: 1, alignItems: 'center' },
  listInner: { width: '100%', maxWidth: layout.maxContent },
});
