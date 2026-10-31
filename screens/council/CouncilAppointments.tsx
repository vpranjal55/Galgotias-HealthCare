import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ListShell } from '../../components/Page';
import { Avatar, Chip, EmptyState, Pill } from '../../components/ui';
import { getAppointments, listUsers, updateAppointmentStatus } from '../../lib/db';
import { colors, radius } from '../../lib/theme';
import type { Appointment, User } from '../../lib/types';
import { useLayout } from '../../lib/useLayout';

const ORDER: Appointment['status'][] = ['pending', 'scheduled', 'completed', 'cancelled'];

export default function CouncilAppointments() {
  const { wide } = useLayout();
  const [apts, setApts] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Appointment['status'] | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setApts(await getAppointments());
    setUsers(await listUsers());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name || id;

  const setStatus = async (a: Appointment, next: Appointment['status']) => {
    await updateAppointmentStatus(a.id, next);
    setApts(await getAppointments());
  };

  const cycle = (a: Appointment) => setStatus(a, ORDER[(ORDER.indexOf(a.status) + 1) % ORDER.length]);

  const shown = filter === 'all' ? apts : apts.filter((a) => a.status === filter);

  const header = (
    <View style={{ paddingTop: wide ? 20 : 8, gap: 12 }}>
      <AppHeader title="Counselor queue" subtitle="Tap a card to advance status" />
      <View style={styles.chips}>
        {(['all', ...ORDER] as const).map((s) => (
          <Chip
            key={s}
            label={`${s[0].toUpperCase() + s.slice(1)} · ${s === 'all' ? apts.length : apts.filter((a) => a.status === s).length}`}
            active={filter === s}
            onPress={() => setFilter(s)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <ListShell header={header}>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        numColumns={wide ? 2 : 1}
        key={wide ? 'two' : 'one'}
        columnWrapperStyle={wide ? { gap: 12 } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        contentContainerStyle={{ padding: wide ? 28 : 16, paddingTop: 12, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState icon="heart-outline" title="Queue is clear" body="Auto-triggers and student requests will land here." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => cycle(item)} style={[styles.card, wide && { flex: 1 }]}>
            <View style={styles.top}>
              <Avatar name={nameOf(item.studentId)} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{nameOf(item.studentId)}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.counselorName} · {item.counselorEmail}
                </Text>
              </View>
            </View>
            <View style={styles.pills}>
              <Pill text={item.source === 'auto' ? 'AUTO' : 'MANUAL'} tone={item.source === 'auto' ? 'danger' : 'info'} />
              <Pill text={item.status} tone={item.status === 'pending' ? 'warning' : item.status === 'completed' ? 'success' : 'neutral'} />
            </View>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={styles.score}>Health score at trigger: {item.healthScore}%</Text>
            <View style={styles.actions}>
              {ORDER.filter((s) => s !== item.status).map((s) => (
                <Pressable key={s} onPress={() => setStatus(item, s)} style={styles.action} hitSlop={4}>
                  <Text style={styles.actionText}>Mark {s}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        )}
      />
    </ListShell>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 12 },
  name: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  reason: { color: colors.navy, marginTop: 10, lineHeight: 18 },
  score: { marginTop: 8, fontWeight: '800', color: colors.maroon, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  action: { backgroundColor: colors.creamDark, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { color: colors.navy, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
});
