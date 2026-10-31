import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { Cols, Page, TileRow } from '../../components/Page';
import { ProgressRing } from '../../components/ProgressRing';
import { Avatar, Card, DemoBadge, Pill, PrimaryButton, ScoreBar } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { dailyExport, exportSummaryText, getAppointments, latestHealthByStudent, students } from '../../lib/db';
import { todayISO } from '../../lib/ids';
import { shareEmail, shareWhatsApp } from '../../lib/share';
import { colors, radius } from '../../lib/theme';
import type { Appointment, DailyExportSummary, HealthMetrics, User } from '../../lib/types';

export default function WardenHome({ navigation }: any) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailyExportSummary | null>(null);
  const [alerts, setAlerts] = useState<Appointment[]>([]);
  const [roster, setRoster] = useState<User[]>([]);
  const [latest, setLatest] = useState<Record<string, HealthMetrics | undefined>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setSummary(await dailyExport());
    const apts = await getAppointments();
    setAlerts(apts.filter((a) => a.source === 'auto' && a.status === 'pending'));
    setRoster(await students());
    setLatest(await latestHealthByStudent());
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

  const text = summary ? exportSummaryText(summary) : '';
  const total = summary?.totalStudents || 0;
  const present = summary?.presentCount ?? 0;
  const returned = (summary?.onTime ?? 0) + (summary?.lateArrivals ?? 0);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name || id;

  const watch = roster
    .map((r) => ({ user: r, h: latest[r.id] }))
    .filter((x) => x.h)
    .sort((a, b) => a.h!.weeklyScore - b.h!.weeklyScore)
    .slice(0, 5);

  const hero = (
    <Card style={{ backgroundColor: colors.navyDeep, borderColor: colors.navyDeep }}>
      <Text style={styles.darkKicker}>TODAY · {todayISO()}</Text>
      <View style={styles.heroRow}>
        <ProgressRing size={128} stroke={13} progress={total ? present / total : 0} color={colors.gold} track="rgba(255,255,255,0.14)">
          <Text style={styles.heroNum}>{present}</Text>
          <Text style={styles.darkCap}>of {total}</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.heroTitle}>Students at mess</Text>
          <Text style={styles.darkCap}>unique students marked present across meals</Text>
          <Text style={[styles.darkCap, { color: colors.goldSoft }]}>
            {returned} of {total} back in hostel
          </Text>
        </View>
      </View>
    </Card>
  );

  const meals = (
    <Card>
      <Text style={styles.cardTitle}>Mess utilisation</Text>
      <MealBar label="Breakfast" icon="sunny-outline" value={summary?.messUtilization.breakfast ?? 0} total={total} color={colors.gold} />
      <MealBar label="Lunch" icon="restaurant-outline" value={summary?.messUtilization.lunch ?? 0} total={total} color={colors.maroon} />
      <MealBar label="Dinner" icon="moon-outline" value={summary?.messUtilization.dinner ?? 0} total={total} color={colors.navy} />
    </Card>
  );

  const curfew = (
    <Card>
      <Text style={styles.cardTitle}>Curfew snapshot</Text>
      <TileRow>
        <Count label="On time" value={summary?.onTime ?? 0} color={colors.success} bg={colors.successSoft} />
        <Count label="Late" value={summary?.lateArrivals ?? 0} color={colors.danger} bg={colors.dangerSoft} />
        <Count label="Not in" value={summary?.notReturned ?? 0} color={colors.warning} bg={colors.warningSoft} />
      </TileRow>
      <View style={{ marginTop: 12 }}>
        <DemoBadge text="DEMO · entries logged by hand — no gateway hardware connected" />
      </View>
    </Card>
  );

  const wellness = (
    <Card style={alerts.length ? { borderColor: colors.danger } : undefined}>
      <View style={styles.between}>
        <Text style={styles.cardTitle}>Wellness monitoring</Text>
        {alerts.length ? <Pill text={`${alerts.length} auto-trigger${alerts.length > 1 ? 's' : ''}`} tone="danger" /> : <Pill text="All clear" tone="success" />}
      </View>
      {alerts.map((a) => (
        <Text key={a.id} style={styles.alert}>
          {nameOf(a.studentId)} · score {a.healthScore}% · counselor session pending
        </Text>
      ))}
      <Text style={styles.sub}>Lowest weekly scores</Text>
      {watch.map(({ user: u, h }) => {
        const sc = h!.weeklyScore;
        return (
          <View key={u.id} style={styles.watchRow}>
            <Avatar name={u.name} size={36} tone={sc <= 50 ? 'maroon' : 'navy'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.watchName}>{u.name}</Text>
              <ScoreBar value={sc} color={sc <= 50 ? colors.danger : sc < 70 ? colors.warning : colors.success} />
            </View>
            <Text style={styles.watchScore}>{sc}%</Text>
          </View>
        );
      })}
      {watch.length === 0 ? <Text style={styles.sub}>No wellness data yet.</Text> : null}
    </Card>
  );

  const exportCard = (
    <Card>
      <Text style={styles.cardTitle}>Daily log export</Text>
      <PrimaryButton title="Share log on WhatsApp" icon="logo-whatsapp" onPress={() => shareWhatsApp(text)} />
      <PrimaryButton
        title="Email daily log"
        tone="navy"
        icon="mail-outline"
        onPress={() => shareEmail(`Galgotias HealthCare Daily Log ${todayISO()}`, text)}
        style={{ marginTop: 10 }}
      />
      <PrimaryButton title="Open mess tracker" tone="ghost" icon="fast-food-outline" onPress={() => navigation.navigate('Mess')} style={{ marginTop: 10 }} />
    </Card>
  );

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader title="Warden desk" subtitle={`${user?.metadata.pgName || 'Campus hostel'} · ${user?.metadata.staffId}`} />
      <Text style={styles.pageTitle}>Dashboard</Text>
      <Cols ratios={[1.1, 1, 1]}>
        <>
          {hero}
          {meals}
        </>
        <>
          {curfew}
          {exportCard}
        </>
        <>{wellness}</>
      </Cols>
    </Page>
  );
}

function MealBar({ label, icon, value, total, color }: { label: string; icon: any; value: number; total: number; color: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.between}>
        <Text style={styles.mealLbl}>{label}</Text>
        <Text style={styles.mealVal}>
          {value} / {total}
        </Text>
      </View>
      <View style={{ height: 6 }} />
      <ScoreBar value={total ? Math.round((value / total) * 100) : 0} color={color} />
    </View>
  );
}

function Count({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.count, { backgroundColor: bg }]}>
      <Text style={[styles.countVal, { color }]}>{value}</Text>
      <Text style={styles.countLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 36, fontWeight: '800', color: colors.navy, letterSpacing: -0.6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  darkKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(255,255,255,0.6)' },
  darkCap: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  heroNum: { color: colors.white, fontSize: 36, fontWeight: '800' },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  cardTitle: { fontWeight: '800', color: colors.navy, fontSize: 17, marginBottom: 6 },
  mealLbl: { color: colors.navy, fontWeight: '700' },
  mealVal: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  count: { flex: 1, borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  countVal: { fontSize: 28, fontWeight: '800' },
  countLbl: { color: colors.navy, fontWeight: '700', fontSize: 12, marginTop: 2 },
  alert: { color: colors.danger, fontWeight: '700', fontSize: 12, marginTop: 8, lineHeight: 18 },
  sub: { color: colors.muted, fontWeight: '800', fontSize: 11, letterSpacing: 0.6, marginTop: 14, marginBottom: 4 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  watchName: { fontWeight: '800', color: colors.navy, marginBottom: 5, fontSize: 13 },
  watchScore: { fontWeight: '800', color: colors.navy, width: 42, textAlign: 'right' },
});
