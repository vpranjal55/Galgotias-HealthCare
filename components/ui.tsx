import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, shadow } from '../lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadow.soft, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  error?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize = 'none',
  icon,
  right,
  error,
}: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? { borderColor: colors.danger } : null]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.maroon} style={{ marginRight: 8 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA3AF"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  tone = 'maroon',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'maroon' | 'navy' | 'gold' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    tone === 'navy' ? colors.navy : tone === 'gold' ? colors.gold : tone === 'ghost' ? 'transparent' : colors.maroon;
  const fg = tone === 'gold' ? colors.navy : tone === 'ghost' ? colors.maroon : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: tone === 'ghost' ? colors.maroon : bg, opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Stat({
  label,
  value,
  icon,
  tint = colors.maroon,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
}) {
  return (
    <View style={[styles.stat, shadow.soft]}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.maroon} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function ScoreBar({ value, color = colors.maroon }: { value: number; color?: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Pill({
  text,
  tone = 'info',
}: {
  text: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.creamDark, fg: colors.navy },
  };
  return (
    <View style={[styles.pill, { backgroundColor: map[tone].bg }]}>
      <Text style={[styles.pillText, { color: map[tone].fg }]}>{text}</Text>
    </View>
  );
}

export function ScreenPad({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingHorizontal: 20, paddingTop: 8 }, style]}>{children}</View>;
}

export function Heading({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Avatar({ name, size = 40, tone = 'maroon' }: { name?: string; size?: number; tone?: 'maroon' | 'navy' | 'gold' }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const bg = tone === 'navy' ? colors.navy : tone === 'gold' ? colors.gold : colors.maroon;
  const fg = tone === 'gold' ? colors.navy : colors.white;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: Math.round(size * 0.38) }}>{initials}</Text>
    </View>
  );
}

export function IconBadge({
  icon,
  tint = colors.maroon,
  size = 44,
  bg = colors.white,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  size?: number;
  bg?: string;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={tint} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, on && styles.segItemOn]}>
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  value,
  tint = colors.maroon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.listRow}>
      <IconBadge icon={icon} tint={tint} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

/** Marks screens whose data is entered by hand / seeded — no RFID, gateway or sensor hardware is connected yet. */
export function DemoBadge({ text = 'DEMO · manual entry — RFID / gateway hardware not connected' }: { text?: string }) {
  return (
    <View style={styles.demo}>
      <Ionicons name="flask-outline" size={14} color={colors.warning} />
      <Text style={styles.demoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.creamDark, borderRadius: radius.full, padding: 4, gap: 2 },
  segItem: { flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: radius.full, alignItems: 'center' },
  segItemOn: { backgroundColor: colors.maroon },
  segText: { fontWeight: '700', fontSize: 13, color: colors.navy },
  segTextOn: { color: colors.white },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.creamCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
  },
  listTitle: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  listValue: { fontSize: 15, color: colors.navy, fontWeight: '800', marginTop: 2 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  demoText: { color: colors.warning, fontSize: 11, fontWeight: '800', letterSpacing: 0.2, flexShrink: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  sectionAction: { color: colors.maroon, fontWeight: '700', fontSize: 13 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: '600' },
  btn: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  btnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.creamDark,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontWeight: '700', color: colors.navy, fontSize: 13 },
  chipTextActive: { color: colors.white },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  emptyBody: { color: colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  barTrack: {
    height: 10,
    backgroundColor: colors.creamDark,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  heading: { fontSize: 30, fontWeight: '800', color: colors.navy, letterSpacing: -0.4 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
