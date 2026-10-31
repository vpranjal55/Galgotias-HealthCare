import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { Cols, Page } from '../../components/Page';
import { Avatar, Card, ListRow, Pill, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getAppointments, getNotifications } from '../../lib/db';
import { colors } from '../../lib/theme';
import type { Appointment, NotificationItem } from '../../lib/types';

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const [apts, setApts] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<NotificationItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        setApts(await getAppointments(user.id));
        setNotes((await getNotifications(user.id)).filter((n) => n.userId === user.id));
      })();
    }, [user]),
  );

  return (
    <Page>
      <AppHeader title="My profile" subtitle="Student · Galgotias College" />
      <Cols ratios={[1, 1]}>
        <>
          <Card>
            <View style={styles.head}>
              <Avatar name={user?.name} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.email}>{user?.email}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill text="STUDENT" tone="info" />
              <Pill text={user?.metadata.course || 'Course'} tone="neutral" />
            </View>
            <View style={{ marginTop: 16 }}>
              <ListRow icon="id-card-outline" title="Enrollment" value={user?.metadata.enrollmentId || '—'} />
              <ListRow icon="calendar-outline" title="Date of birth" value={user?.dateOfBirth || '—'} tint={colors.navy} />
              <ListRow icon="home-outline" title="Hostel / PG" value={user?.metadata.hostelBlock || '—'} />
              <ListRow icon="bed-outline" title="Room" value={user?.metadata.roomNumber || '—'} tint={colors.navy} />
              <ListRow icon="school-outline" title="Mentor" value={user?.metadata.mentorEmail || '—'} />
            </View>
          </Card>
          <PrimaryButton title="Sign out" tone="ghost" icon="log-out-outline" onPress={logout} />
        </>
        <>
          <Card>
            <Text style={styles.cardTitle}>Appointments</Text>
            {apts.length === 0 ? <Text style={styles.muted}>No counselor sessions yet.</Text> : null}
            {apts.map((a) => (
              <View key={a.id} style={styles.apt}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aptTitle}>{a.counselorName}</Text>
                  <Text style={styles.muted}>{a.reason}</Text>
                </View>
                <Pill text={a.status} tone={a.status === 'pending' ? 'warning' : 'success'} />
              </View>
            ))}
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Email & system alerts</Text>
            {notes.length === 0 ? <Text style={styles.muted}>No alerts.</Text> : null}
            {notes.slice(0, 6).map((n) => (
              <View key={n.id} style={styles.note}>
                <Text style={styles.aptTitle}>{n.title}</Text>
                <Text style={styles.muted}>{n.body}</Text>
              </View>
            ))}
          </Card>
        </>
      </Cols>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 22, fontWeight: '800', color: colors.navy },
  email: { color: colors.muted, marginTop: 2 },
  cardTitle: { fontWeight: '800', color: colors.navy, fontSize: 17, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  apt: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  aptTitle: { fontWeight: '800', color: colors.navy },
  note: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
});
