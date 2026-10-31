import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { Cols, Page, TileRow } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { Card, IconBadge, Pill, Stat } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { dailyExport, getAppointments, getNotifications, listUsers } from '../../lib/db';
import { colors, radius } from '../../lib/theme';
import type { Appointment, DailyExportSummary, NotificationItem, User } from '../../lib/types';

export default function CouncilHome({ navigation }: any) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<DailyExportSummary | null>(null);
  const [apts, setApts] = useState<Appointment[]>([]);
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setUsers(await listUsers());
    setSummary(await dailyExport());
    setApts(await getAppointments());
    if (user) {
      const n = await getNotifications(user.id);
      setAlerts(n.filter((x) => x.userId.startsWith('mentor:')));
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const stu = users.filter((u) => u.role === 'student').length;
  const wrd = users.filter((u) => u.role === 'warden').length;
  const cnc = users.filter((u) => u.role === 'council').length;
  const auto = apts.filter((a) => a.source === 'auto');
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name || id;
  const total = summary?.totalStudents || 0;
  const present = summary?.presentCount ?? 0;
  const returned = (summary?.onTime ?? 0) + (summary?.lateArrivals ?? 0);
  const unread = alerts.filter((a) => !a.read);

  const pulse = (
    <Card style={{ backgroundColor: colors.navyDeep, borderColor: colors.navyDeep }}>
      <Text style={styles.darkKicker}>CAMPUS PULSE · TODAY</Text>
      <View style={styles.ringRow}>
        <RingBlock label="Mess diners" value={present} total={total} color={colors.gold} />
        <RingBlock label="Back in hostel" value={returned} total={total} color={colors.maroonSoft} />
      </View>
      <View style={styles.legend}>
        <Text style={styles.darkLine}>
          Meals · B {summary?.messUtilization.breakfast ?? 0} · L {summary?.messUtilization.lunch ?? 0} · D {summary?.messUtilization.dinner ?? 0}
        </Text>
        <Text style={styles.darkLine}>
          Late returns {summary?.lateArrivals ?? 0} · Still out {summary?.notReturned ?? 0}
        </Text>
      </View>
    </Card>
  );

  const alertsCard = (
    <Card style={unread.length ? { borderColor: colors.maroonSoft } : undefined}>
      <View style={styles.between}>
        <Text style={styles.cardTitle}>Counselor alerts</Text>
        <Pill text={unread.length ? `${unread.length} unread` : 'All read'} tone={unread.length ? 'danger' : 'success'} />
      </View>
      {alerts.slice(0, 4).map((n) => (
        <View key={n.id} style={styles.alertRow}>
          <Ionicons name="warning-outline" size={18} color={n.read ? colors.muted : colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{n.title}</Text>
            <Text style={styles.muted} numberOfLines={3}>
              {n.body}
            </Text>
          </View>
        </View>
      ))}
      {alerts.length === 0 ? <Text style={styles.muted}>No counselor alerts.</Text> : null}
      <Text style={styles.link} onPress={() => navigation.navigate('Queue')}>
        Open counselor queue →
      </Text>
    </Card>
  );

  const escal = (
    <Card>
      <Text style={styles.cardTitle}>Wellness escalations</Text>
      {auto.length === 0 ? <Text style={styles.muted}>No auto-triggered appointments right now.</Text> : null}
      {auto.map((a) => (
        <View key={a.id} style={styles.apt}>
          <IconBadge icon="heart-outline" tint={colors.maroon} size={40} bg={colors.maroonTint} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aptTitle}>
              {nameOf(a.studentId)} · {a.healthScore}%
            </Text>
            <Text style={styles.muted}>{a.reason}</Text>
          </View>
          <Pill text={a.status} tone={a.status === 'pending' ? 'danger' : 'neutral'} />
        </View>
      ))}
    </Card>
  );

  return (
    <Page
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <AppHeader title="Council command" subtitle={user?.metadata.councilRole || 'Student council'} />
      <Text style={styles.pageTitle}>Dashboard</Text>
      <TileRow>
        <Stat label="Students" value={stu} icon="school-outline" tint={colors.maroon} />
        <Stat label="Wardens" value={wrd} icon="shield-outline" tint={colors.navy} />
        <Stat label="Council" value={cnc} icon="ribbon-outline" tint={colors.gold} />
      </TileRow>
      <Cols ratios={[1, 1]}>
        <>{pulse}</>
        <>
          {alertsCard}
          {escal}
        </>
      </Cols>
    </Page>
  );
}

function RingBlock({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <ProgressRing size={110} stroke={12} progress={total ? value / total : 0} color={color} track="rgba(255,255,255,0.14)">
        <Text style={styles.ringNum}>{value}</Text>
        <Text style={styles.darkCap}>of {total}</Text>
      </ProgressRing>
      <Text style={styles.ringLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 36, fontWeight: '800', color: colors.navy, letterSpacing: -0.6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  darkKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  darkCap: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  darkLine: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13, marginTop: 4 },
  ringRow: { flexDirection: 'row', gap: 12, marginVertical: 18 },
  ringNum: { color: colors.white, fontSize: 28, fontWeight: '800' },
  ringLbl: { color: colors.white, fontWeight: '800', marginTop: 10, fontSize: 13 },
  legend: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 10 },
  cardTitle: { fontWeight: '800', color: colors.navy, fontSize: 17 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  alertRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  alertTitle: { fontWeight: '800', color: colors.navy, fontSize: 13 },
  link: { color: colors.maroon, fontWeight: '800', fontSize: 13, marginTop: 12 },
  apt: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'center', borderRadius: radius.md },
  aptTitle: { fontWeight: '800', color: colors.navy },
});
