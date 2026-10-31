import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ListShell } from '../../components/Page';
import { Avatar, DemoBadge, EmptyState, Pill, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getCurfewLogs, logCurfew, students } from '../../lib/db';
import { nowTime } from '../../lib/ids';
import { notify } from '../../lib/notify';
import { colors, radius } from '../../lib/theme';
import type { CurfewLog, User } from '../../lib/types';
import { useLayout } from '../../lib/useLayout';

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function CurfewTracker() {
  const { user } = useAuth();
  const { wide } = useLayout();
  const [list, setList] = useState<User[]>([]);
  const [logs, setLogs] = useState<CurfewLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [picked, setPicked] = useState<User | null>(null);
  const [time, setTime] = useState(nowTime());
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([students(), getCurfewLogs()]);
    setList(s);
    setLogs(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const logFor = (id: string) => logs.find((l) => l.studentId === id);

  const save = async () => {
    if (!user || !picked) return;
    const t = time.trim();
    if (!TIME_RE.test(t)) {
      setErr('Enter time as HH:mm, e.g. 21:45');
      return;
    }
    const entry = await logCurfew({
      studentId: picked.id,
      entryTime: t.padStart(5, '0'),
      notes,
      recordedBy: user.id,
    });
    const who = picked.name;
    setPicked(null);
    setNotes('');
    setErr('');
    setLogs(await getCurfewLogs());
    if (entry.isLate) {
      notify('Late arrival flagged', `${who} returned at ${entry.entryTime} (curfew 22:00).`);
    }
  };

  const late = logs.filter((l) => l.isLate).length;

  const header = (
    <View style={{ paddingTop: wide ? 20 : 8, gap: 12 }}>
      <AppHeader title="Curfew & entry" subtitle={`${late} late · ${Math.max(0, list.length - logs.length)} not returned`} />
      <DemoBadge text="DEMO · entries typed by the warden — gateway / RFID hardware not connected" />
    </View>
  );

  return (
    <ListShell header={header}>
      <FlatList
        data={list}
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
        ListEmptyComponent={<EmptyState icon="moon-outline" title="No residents" body="Students assigned to hostels will show here." />}
        renderItem={({ item }) => {
          const log = logFor(item.id);
          return (
            <Pressable
              onPress={() => {
                setPicked(item);
                setTime(log?.entryTime || nowTime());
                setNotes(log?.notes || '');
                setErr('');
              }}
              style={[styles.row, wide && { flex: 1 }]}
            >
              <Avatar name={item.name} size={40} tone={log?.isLate ? 'maroon' : 'navy'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.metadata.roomNumber} · {item.metadata.hostelBlock}
                </Text>
              </View>
              {log ? (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.time}>{log.entryTime}</Text>
                  <Pill text={log.isLate ? 'LATE' : 'ON TIME'} tone={log.isLate ? 'danger' : 'success'} />
                </View>
              ) : (
                <Pill text="NOT IN" tone="warning" />
              )}
            </Pressable>
          );
        }}
      />

      <Modal visible={!!picked} animationType="slide" transparent onRequestClose={() => setPicked(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Log entry · {picked?.name}</Text>
            <Text style={styles.meta}>Curfew 22:00 · anything later is flagged</Text>
            <Text style={styles.label}>Return time (HH:mm)</Text>
            <TextInput value={time} onChangeText={setTime} style={[styles.input, err ? { borderColor: colors.danger } : null]} placeholder="22:15" />
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Reason, verification…"
              multiline
            />
            <PrimaryButton title="Save entry" icon="save-outline" onPress={save} style={{ marginTop: 14 }} />
            <Pressable onPress={() => setPicked(null)} style={styles.cancel}>
              <Ionicons name="close" size={16} color={colors.muted} />
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ListShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  name: { fontWeight: '800', color: colors.navy },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  time: { fontWeight: '800', color: colors.navy },
  overlay: { flex: 1, backgroundColor: 'rgba(18,38,58,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  label: { marginTop: 14, marginBottom: 6, fontWeight: '700', color: colors.navy, fontSize: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  err: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 6 },
  cancel: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  cancelText: { color: colors.muted, fontWeight: '700' },
});
