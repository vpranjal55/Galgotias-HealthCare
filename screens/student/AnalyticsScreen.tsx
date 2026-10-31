import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { ChartTip, PillBars, TrendBars } from '../../components/Charts';
import { Cols, Page, TileRow } from '../../components/Page';
import { Card, Pill, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getHealth, weeklyReportText } from '../../lib/db';
import { daysAgoISO, weekdayShort } from '../../lib/ids';
import { shareEmail, shareWhatsApp } from '../../lib/share';
import { colors, radius } from '../../lib/theme';
import type { HealthMetrics } from '../../lib/types';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [days, setDays] = useState<HealthMetrics[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(daysAgoISO(0));

  const load = useCallback(async () => {
    if (!user) return;
    setDays(await getHealth(user.id));
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

  const latest = days[0];
  const week = [6, 5, 4, 3, 2, 1, 0].map((n) => {
    const date = daysAgoISO(n);
    return { date, row: days.find((d) => d.date === date) };
  });
  const report = user ? weeklyReportText(user, days) : '';
  const sel = days.find((d) => d.date === selected);
  const avgSteps = days.length ? Math.round(days.slice(0, 7).reduce((s, d) => s + d.steps, 0) / Math.min(7, days.length)) : 0;
  const live = latest?.source === 'health_connect';
  const mixed = live && days.slice(0, 7).some((d) => d.source !== 'health_connect');

  const summary = (
    <Card>
      <View style={styles.between}>
        <Text style={styles.kicker}>THIS WEEK</Text>
        <Pill text={mixed ? 'Health Connect + demo days' : live ? 'Health Connect data' : 'Campus demo data'} tone={live && !mixed ? 'success' : 'warning'} />
      </View>
      <Text style={styles.big}>{latest?.weeklyScore ?? 0}%</Text>
      <Pill
        text={(latest?.weeklyScore ?? 0) <= 50 ? 'Auto counselor trigger active' : 'Composite of steps, calories & mood'}
        tone={(latest?.weeklyScore ?? 0) <= 50 ? 'danger' : 'info'}
      />
      <TileRow style={{ marginTop: 14 }}>
        <Mini label="Mental" value={`${latest?.mentalScore ?? 0}%`} />
        <Mini label="Physical" value={`${latest?.physicalScore ?? 0}%`} />
        <Mini label="Mood" value={latest?.mood || '—'} />
      </TileRow>
      <TileRow style={{ marginTop: 10 }}>
        <Mini label="Avg steps / day" value={avgSteps.toLocaleString('en-IN')} />
        <Mini label="Days logged" value={`${Math.min(7, days.length)}`} />
      </TileRow>
    </Card>
  );

  const steps = (
    <Card>
      <Text style={styles.cardTitle}>Step trend (7 days)</Text>
      <ChartTip>
        {weekdayShort(selected)} · {sel ? `${sel.steps.toLocaleString('en-IN')} steps` : 'no data'}
      </ChartTip>
      <PillBars
        data={week.map((w) => ({ key: w.date, label: weekdayShort(w.date).slice(0, 3), value: w.row?.steps ?? 0 }))}
        selected={selected}
        onSelect={setSelected}
      />
    </Card>
  );

  const trend = (
    <Card>
      <Text style={styles.cardTitle}>Daily mental vs physical</Text>
      <Text style={styles.legend}>
        <Text style={{ color: colors.maroon }}>● Mental</Text>   <Text style={{ color: colors.navy }}>● Physical</Text>
      </Text>
      <TrendBars
        data={week.map((w) => ({
          key: w.date,
          label: weekdayShort(w.date).slice(0, 3),
          a: w.row?.mentalScore ?? 0,
          b: w.row?.physicalScore ?? 0,
        }))}
        selected={selected}
        onSelect={setSelected}
      />
      {sel ? (
        <Text style={styles.sel}>
          {weekdayShort(selected)} · Mental {sel.mentalScore} · Physical {sel.physicalScore}
        </Text>
      ) : null}
    </Card>
  );

  const share = (
    <Card>
      <Text style={styles.cardTitle}>One-tap share</Text>
      <PrimaryButton title="Share on WhatsApp" icon="logo-whatsapp" onPress={() => shareWhatsApp(report)} style={{ marginBottom: 10 }} />
      <PrimaryButton
        title="Email report"
        tone="navy"
        icon="mail-outline"
        onPress={() => shareEmail('Galgotias HealthCare — Weekly Health Report', report, user?.metadata.mentorEmail)}
      />
    </Card>
  );

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader title="Weekly Health Analytics" subtitle="Physical + mental combined score" />
      <Cols ratios={[1, 1.2]}>
        <>
          {summary}
          {share}
        </>
        <>
          {steps}
          {trend}
        </>
      </Cols>
    </Page>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniVal}>{value}</Text>
      <Text style={styles.miniLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, color: colors.muted },
  big: { fontSize: 56, fontWeight: '800', color: colors.navy, marginVertical: 4, letterSpacing: -1 },
  mini: { flex: 1, backgroundColor: colors.creamCard, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
  miniVal: { fontWeight: '800', color: colors.navy, fontSize: 17 },
  miniLbl: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  cardTitle: { fontWeight: '800', color: colors.navy, fontSize: 17, marginBottom: 12 },
  legend: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
  sel: { marginTop: 12, color: colors.navy, fontWeight: '700', fontSize: 12 },
});
