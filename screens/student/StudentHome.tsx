import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ChartTip, DayStrip, PillBars, TrendBars } from '../../components/Charts';
import HealthConnectCard from '../../components/HealthConnectCard';
import { Cols, Page, TileRow } from '../../components/Page';
import { ActivityRings } from '../../components/ProgressRing';
import { Card, IconBadge, ListRow, Pill, PrimaryButton, ScoreBar, Segmented } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { addSteps, getAppointments, getHealth, getNotifications } from '../../lib/db';
import { dayOfMonth, daysAgoISO, todayISO, weekdayShort } from '../../lib/ids';
import { colors, radius } from '../../lib/theme';
import { DAILY_GOALS } from '../../lib/triggers';
import type { Appointment, HealthMetrics, NotificationItem } from '../../lib/types';
import type { HcStatus } from '../../lib/healthConnect.types';
import { useLayout } from '../../lib/useLayout';

type Metric = 'steps' | 'calories' | 'distance';

export default function StudentHome({ navigation }: any) {
  const { user } = useAuth();
  const { wide } = useLayout();
  const [health, setHealth] = useState<HealthMetrics[]>([]);
  const [apts, setApts] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(todayISO());
  const [metric, setMetric] = useState<Metric>('steps');
  const [hc, setHc] = useState<HcStatus | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [h, a, n] = await Promise.all([getHealth(user.id), getAppointments(user.id), getNotifications(user.id)]);
    setHealth(h);
    setApts(a);
    setNotes(n.filter((x) => x.userId === user.id));
  }, [user]);

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

  const week = useMemo(() => {
    const dates = [6, 5, 4, 3, 2, 1, 0].map((n) => daysAgoISO(n));
    return dates.map((date) => ({ date, row: health.find((h) => h.date === date) }));
  }, [health]);

  const latest = health[0];
  const sel = health.find((h) => h.date === selected);
  const isToday = selected === todayISO();
  const score = latest?.weeklyScore ?? 0;
  const tone = score <= 50 ? colors.danger : score < 70 ? colors.warning : colors.success;

  const others = week
    .filter((w) => w.row && w.row.steps > 0 && w.date !== selected && w.row.source === sel?.source)
    .map((w) => w.row!.steps);
  const avgOthers = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
  const delta = sel && avgOthers > 0 ? Math.round(((sel.steps - avgOthers) / avgOthers) * 1000) / 10 : null;

  const noActivity = !!sel && !sel.source && sel.steps === 0;
  const sourceLabel = !sel || noActivity ? 'No activity data' : sel.source === 'health_connect' ? 'Health Connect' : 'Demo data';
  const sourceTone = !sel || noActivity ? 'neutral' : sel.source === 'health_connect' ? 'success' : 'warning';
  const mixedSources =
    week.some((w) => w.row?.source === 'health_connect') && week.some((w) => w.row?.source === 'demo');
  const est = (f: 'distance' | 'calories') => (sel?.derivedFields?.includes(f) ? '~' : '');

  const barData = week.map((w) => ({
    key: w.date,
    label: weekdayShort(w.date).slice(0, 3),
    value: !w.row ? 0 : metric === 'steps' ? w.row.steps : metric === 'calories' ? w.row.calories : w.row.distanceKm,
  }));
  const metricUnit = metric === 'steps' ? 'steps' : metric === 'calories' ? 'kcal' : 'km';
  const selBar = barData.find((b) => b.key === selected);

  const trend = week.map((w) => ({
    key: w.date,
    label: weekdayShort(w.date).slice(0, 3),
    a: w.row?.mentalScore ?? 0,
    b: w.row?.physicalScore ?? 0,
  }));

  const dayChips = week.map((w) => ({
    key: w.date,
    top: w.date === todayISO() ? 'Today' : weekdayShort(w.date).slice(0, 3),
    bottom: dayOfMonth(w.date),
    hasData: !!w.row,
  }));

  const rings = [
    { progress: (sel?.steps ?? 0) / DAILY_GOALS.steps, color: colors.maroonSoft },
    { progress: (sel?.distanceKm ?? 0) / DAILY_GOALS.distanceKm, color: colors.gold },
    { progress: (sel?.calories ?? 0) / DAILY_GOALS.calories, color: colors.white },
  ];

  const hcConnected = hc?.state === 'connected';

  const stepsCard = (
    <Card style={{ backgroundColor: colors.white }}>
      <View style={styles.rowCenter}>
        <IconBadge icon="footsteps-outline" size={54} bg={colors.maroonTint} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cap}>Steps · {isToday ? 'today' : weekdayShort(selected)}</Text>
          <Text style={styles.big}>{(sel?.steps ?? 0).toLocaleString('en-IN')}</Text>
        </View>
        <Pill text={sourceLabel} tone={sourceTone as any} />
      </View>
      {delta !== null ? (
        <Text style={styles.deltaLine}>
          {delta >= 0 ? 'More' : 'Less'} {Math.abs(delta)}% than your average on other days this week
        </Text>
      ) : (
        <Text style={styles.deltaLine}>{sel ? 'Not enough days yet to compare.' : 'No reading for this day.'}</Text>
      )}
      <TileRow style={{ marginTop: 14 }}>
        <MiniTile icon="navigate-outline" tint={colors.info} label="Distance" value={sel ? `${est('distance')}${sel.distanceKm} km` : '—'} />
        <MiniTile icon="flame-outline" tint={colors.warning} label="Calories" value={sel ? `${est('calories')}${sel.calories}` : '—'} />
        <MiniTile
          icon="heart-outline"
          tint={colors.maroon}
          label="Heart rate"
          value={sel?.heartRateBpm ? `${sel.heartRateBpm} bpm` : '—'}
        />
      </TileRow>
      {!sel?.heartRateBpm ? (
        <Text style={styles.fine}>Heart rate appears only when read from Health Connect on Android.</Text>
      ) : null}
    </Card>
  );

  const wellnessCard = (
    <Card>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>Wellness trend</Text>
          <Text style={styles.cap}>Mental vs physical · last 7 days</Text>
        </View>
        <View style={styles.legend}>
          <Dot color={colors.maroon} label="Mental" />
          <Dot color={colors.navy} label="Physical" />
        </View>
      </View>
      <View style={{ height: 12 }} />
      <TrendBars data={trend} selected={selected} onSelect={setSelected} />
      {sel ? (
        <Text style={styles.trendNote}>
          {weekdayShort(selected)} · Mental {sel.mentalScore}% · Physical {sel.physicalScore}% · Mood {sel.mood}
        </Text>
      ) : null}
    </Card>
  );

  const trackerCard = (
    <Card>
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={styles.cardTitle}>Activity tracker</Text>
      </View>
      <Segmented
        value={metric}
        onChange={setMetric}
        options={[
          { key: 'steps', label: 'Steps' },
          { key: 'calories', label: 'Calories' },
          { key: 'distance', label: 'Distance' },
        ]}
      />
      <View style={{ height: 14 }} />
      <ChartTip>
        {weekdayShort(selected)} · {selBar && selBar.value > 0 ? `${selBar.value.toLocaleString('en-IN')} ${metricUnit}` : 'no data'}
      </ChartTip>
      <PillBars data={barData} selected={selected} onSelect={setSelected} color={colors.maroon} />
    </Card>
  );

  const scoreCard = (
    <Card style={{ backgroundColor: colors.creamCard }}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cap}>WEEKLY HEALTH SCORE</Text>
          <Text style={[styles.score, { color: tone }]}>{score}%</Text>
          <Pill
            text={score <= 50 ? 'Support triggered' : score < 70 ? 'Needs attention' : 'On track'}
            tone={score <= 50 ? 'danger' : score < 70 ? 'warning' : 'success'}
          />
        </View>
        <View style={styles.mentalDot}>
          <Text style={styles.mentalNum}>{latest?.mentalScore ?? '—'}</Text>
          <Text style={styles.mentalLbl}>mental</Text>
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.fine}>Physical {latest?.physicalScore ?? 0}%</Text>
          <Text style={styles.fine}>Mental {latest?.mentalScore ?? 0}%</Text>
        </View>
        <ScoreBar value={latest?.physicalScore ?? 0} color={colors.navy} />
        <View style={{ height: 8 }} />
        <ScoreBar value={latest?.mentalScore ?? 0} color={colors.maroon} />
      </View>
      {mixedSources ? (
        <Text style={[styles.fine, { marginTop: 10 }]}>
          This week mixes Health Connect days with campus demo days, so the score is partly demo data.
        </Text>
      ) : null}
    </Card>
  );

  const ringsCard = (
    <Card style={styles.dark}>
      <View style={styles.rowBetween}>
        <Text style={[styles.cardTitle, { color: colors.white }]}>Activity rings</Text>
        <Text style={styles.darkCap}>{isToday ? 'Today' : weekdayShort(selected)}</Text>
      </View>
      <View style={{ alignItems: 'center', marginVertical: 14 }}>
        <ActivityRings rings={rings} size={wide ? 200 : 180} track="rgba(255,255,255,0.12)">
          <Text style={styles.ringBig}>{Math.round(Math.min(1, (sel?.steps ?? 0) / DAILY_GOALS.steps) * 100)}%</Text>
          <Text style={styles.darkCap}>of step goal</Text>
        </ActivityRings>
      </View>
      <RingLegend color={colors.maroonSoft} label="Steps" value={`${(sel?.steps ?? 0).toLocaleString('en-IN')} / ${DAILY_GOALS.steps.toLocaleString('en-IN')}`} />
      <RingLegend color={colors.gold} label="Distance" value={`${sel?.distanceKm ?? 0} / ${DAILY_GOALS.distanceKm} km`} />
      <RingLegend color={colors.white} label="Calories" value={`${sel?.calories ?? 0} / ${DAILY_GOALS.calories} kcal`} />
    </Card>
  );

  const hcBlock = user ? (
    <>
      <HealthConnectCard studentId={user.id} onSynced={load} onStatus={setHc} />
      {!hcConnected ? (
        <Card style={{ backgroundColor: colors.goldTint, borderColor: colors.goldSoft }}>
          <Text style={styles.cardTitle}>Campus demo tools</Text>
          <Text style={styles.fine}>
            Simulated pedometer for the prototype. Adds steps tagged as demo data — never shown as device readings.
          </Text>
          <PrimaryButton
            title="Simulate +250 steps (demo)"
            icon="fitness-outline"
            tone="navy"
            style={{ marginTop: 10 }}
            onPress={async () => {
              await addSteps(user.id, 250);
              setSelected(todayISO());
              await load();
            }}
          />
        </Card>
      ) : null}
    </>
  ) : null;

  const alertsCard = (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Wellness alerts</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Wellness')}>
          Open chat
        </Text>
      </View>
      {notes.slice(0, 3).map((n) => (
        <View key={n.id} style={styles.note}>
          <Ionicons
            name={n.kind === 'alert' ? 'warning-outline' : n.kind === 'email' ? 'mail-outline' : 'notifications-outline'}
            size={16}
            color={colors.maroon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>{n.title}</Text>
            <Text style={styles.noteBody}>{n.body}</Text>
          </View>
        </View>
      ))}
      {notes.length === 0 ? <Text style={styles.fine}>No alerts. Keep your streak going.</Text> : null}
    </Card>
  );

  const aptCard = apts[0] ? (
    <Card style={{ borderColor: colors.gold }}>
      <Pill text={apts[0].source === 'auto' ? 'AUTO TRIGGER' : 'REQUESTED'} tone="warning" />
      <Text style={[styles.cardTitle, { marginTop: 8 }]}>{apts[0].counselorName}</Text>
      <Text style={styles.noteBody}>{apts[0].reason}</Text>
      <Text style={[styles.fine, { marginTop: 6 }]}>Status: {apts[0].status.toUpperCase()}</Text>
    </Card>
  ) : null;

  const identityCard = (
    <Card>
      <Text style={styles.cardTitle}>Campus identity</Text>
      <ListRow icon="id-card-outline" title="Enrollment" value={user?.metadata.enrollmentId || '—'} />
      <ListRow icon="school-outline" title="Course" value={user?.metadata.course || '—'} tint={colors.navy} />
      <ListRow icon="home-outline" title="Hostel" value={user?.metadata.hostelBlock || 'Unassigned'} />
      <ListRow icon="bed-outline" title="Room" value={user?.metadata.roomNumber || '—'} tint={colors.navy} />
    </Card>
  );

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader title={`Hello, ${user?.name.split(' ')[0]}`} subtitle={user?.metadata.course} />

      <View style={wide ? styles.titleRowWide : styles.titleRow}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Pressable style={styles.cta} onPress={() => navigation.navigate('Wellness')}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
          <Text style={styles.ctaText}>Talk to wellness AI</Text>
        </Pressable>
      </View>

      <DayStrip days={dayChips} selected={selected} onSelect={setSelected} />

      <Cols ratios={[1.15, 1.1, 0.95]}>
        <>
          {stepsCard}
          {wellnessCard}
          {identityCard}
        </>
        <>
          {trackerCard}
          {scoreCard}
          {aptCard}
          {alertsCard}
        </>
        <>
          {ringsCard}
          {hcBlock}
          <Pressable style={styles.analytics} onPress={() => navigation.navigate('Analytics')}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.white} />
            <Text style={styles.ctaText}>Open weekly analytics & share report</Text>
          </Pressable>
        </>
      </Cols>
    </Page>
  );
}

function MiniTile({ icon, tint, label, value }: { icon: any; tint: string; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={tint} />
      <Text style={styles.tileVal} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLbl}>{label}</Text>
    </View>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={styles.fine}>{label}</Text>
    </View>
  );
}

function RingLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={styles.legendLbl}>{label}</Text>
      <Text style={styles.legendVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { gap: 12 },
  titleRowWide: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 36, fontWeight: '800', color: colors.navy, letterSpacing: -0.6 },
  cta: {
    backgroundColor: colors.maroon,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: colors.white, fontWeight: '800' },
  analytics: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cap: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.muted },
  big: { fontSize: 40, fontWeight: '800', color: colors.navy, letterSpacing: -0.8 },
  deltaLine: { marginTop: 10, color: colors.navy, fontWeight: '600', fontSize: 13 },
  tile: { flex: 1, backgroundColor: colors.creamCard, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line, gap: 4 },
  tileVal: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  tileLbl: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  fine: { color: colors.muted, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  cardTitle: { fontWeight: '800', color: colors.navy, fontSize: 17 },
  legend: { flexDirection: 'row', gap: 12 },
  trendNote: { marginTop: 12, color: colors.navy, fontWeight: '700', fontSize: 12 },
  score: { fontSize: 48, fontWeight: '800', marginVertical: 2 },
  mentalDot: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 7,
    borderColor: colors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  mentalNum: { fontWeight: '800', fontSize: 22, color: colors.navy },
  mentalLbl: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  dark: { backgroundColor: colors.navyDeep, borderColor: colors.navyDeep },
  darkCap: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700' },
  ringBig: { color: colors.white, fontSize: 30, fontWeight: '800' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  legendLbl: { flex: 1, color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 13 },
  legendVal: { color: colors.white, fontWeight: '800', fontSize: 13 },
  note: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  noteTitle: { fontWeight: '800', color: colors.navy, fontSize: 13 },
  noteBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  link: { color: colors.maroon, fontWeight: '800', fontSize: 12 },
});
