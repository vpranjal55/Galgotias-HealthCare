import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ListShell } from '../../components/Page';
import { Avatar, DemoBadge, EmptyState, ScoreBar, Segmented } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getMessLogs, students, toggleMeal } from '../../lib/db';
import { colors, radius } from '../../lib/theme';
import type { MealType, MessLog, User } from '../../lib/types';
import { useLayout } from '../../lib/useLayout';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function MessTracker() {
  const { user } = useAuth();
  const { wide } = useLayout();
  const [list, setList] = useState<User[]>([]);
  const [logs, setLogs] = useState<MessLog[]>([]);
  const [meal, setMeal] = useState<MealType>('breakfast');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([students(), getMessLogs()]);
    setList(s);
    setLogs(m);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const presentOf = (id: string) => logs.find((l) => l.studentId === id && l.meal === meal)?.present ?? false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const count = useMemo(() => list.filter((s) => presentOf(s.id)).length, [list, logs, meal]);

  const onToggle = async (studentId: string) => {
    if (!user) return;
    await toggleMeal(studentId, meal, user.id);
    setLogs(await getMessLogs());
  };

  const header = (
    <View style={{ paddingTop: wide ? 20 : 8, gap: 12 }}>
      <AppHeader title="Mess tracker" subtitle={`${count} / ${list.length} present · ${meal}`} />
      <DemoBadge text="DEMO · tap to mark attendance — RFID mess scanner not connected" />
      <Segmented
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ key: m, label: m[0].toUpperCase() + m.slice(1) }))}
      />
      <ScoreBar value={list.length ? Math.round((count / list.length) * 100) : 0} color={colors.success} />
    </View>
  );

  return (
    <ListShell header={header}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        numColumns={wide ? 2 : 1}
        key={wide ? 'two' : 'one'}
        columnWrapperStyle={wide ? { gap: 12 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: wide ? 28 : 16, paddingTop: 12, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No students" body="Registered students will appear here." />}
        renderItem={({ item }) => {
          const on = presentOf(item.id);
          return (
            <Pressable onPress={() => onToggle(item.id)} style={[styles.row, wide && { flex: 1 }, on && styles.rowOn]}>
              <Avatar name={item.name} size={40} tone={on ? 'navy' : 'maroon'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.metadata.enrollmentId} · {item.metadata.hostelBlock}
                </Text>
              </View>
              <View style={[styles.dot, on && styles.dotOn]}>
                <Ionicons name={on ? 'checkmark' : 'remove'} size={16} color={on ? colors.white : colors.muted} />
              </View>
            </Pressable>
          );
        }}
      />
    </ListShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowOn: { borderColor: colors.success, backgroundColor: '#f3fbf6' },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.success },
  name: { fontWeight: '800', color: colors.navy },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
