import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ListShell } from '../../components/Page';
import { Avatar, Chip, EmptyState, Pill } from '../../components/ui';
import { listUsers } from '../../lib/db';
import { colors, radius } from '../../lib/theme';
import type { Role, User } from '../../lib/types';
import { useLayout } from '../../lib/useLayout';

export default function DirectoryScreen() {
  const { wide } = useLayout();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setUsers(await listUsers()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (!q.trim()) return true;
      const blob = `${u.name} ${u.email} ${u.metadata.enrollmentId || ''} ${u.metadata.staffId || ''}`.toLowerCase();
      return blob.includes(q.trim().toLowerCase());
    });
  }, [users, q, role]);

  const countOf = (r: Role | 'all') => (r === 'all' ? users.length : users.filter((u) => u.role === r).length);

  const header = (
    <View style={{ paddingTop: wide ? 20 : 8, gap: 12 }}>
      <AppHeader title="Campus directory" subtitle={`${users.length} registered accounts`} />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search name, email, ID"
          placeholderTextColor="#9AA3AF"
          style={styles.search}
        />
      </View>
      <View style={styles.chips}>
        {(['all', 'student', 'warden', 'council'] as const).map((r) => (
          <Chip
            key={r}
            label={`${r === 'all' ? 'All' : r[0].toUpperCase() + r.slice(1)} · ${countOf(r)}`}
            active={role === r}
            onPress={() => setRole(r)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <ListShell header={header}>
      <FlatList
        data={filtered}
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
        ListEmptyComponent={<EmptyState icon="search-outline" title="No matches" body="Try another name or role filter." />}
        renderItem={({ item }) => (
          <View style={[styles.row, wide && { flex: 1 }]}>
            <Avatar name={item.name} size={44} tone={item.role === 'student' ? 'maroon' : item.role === 'warden' ? 'gold' : 'navy'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.email}
              </Text>
              <Text style={styles.meta}>{item.metadata.enrollmentId || item.metadata.staffId || item.metadata.councilRole || '—'}</Text>
            </View>
            <Pill text={item.role} tone={item.role === 'student' ? 'info' : item.role === 'warden' ? 'warning' : 'success'} />
          </View>
        )}
      />
    </ListShell>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
  },
  search: { flex: 1, paddingVertical: 13, color: colors.ink, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
    alignItems: 'center',
  },
  name: { fontWeight: '800', color: colors.navy },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
