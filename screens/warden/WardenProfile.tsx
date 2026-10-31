import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import { Cols, Page } from '../../components/Page';
import { Avatar, Card, DemoBadge, ListRow, Pill, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../lib/theme';

export default function WardenProfile() {
  const { user, logout } = useAuth();
  return (
    <Page>
      <AppHeader title="Staff profile" subtitle="Warden · Hostel operations" />
      <Cols ratios={[1, 1]}>
        <Card>
          <View style={styles.head}>
            <Avatar name={user?.name} size={64} tone="navy" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pill text="WARDEN" tone="warning" />
            <Pill text={user?.metadata.staffId || 'STAFF'} tone="neutral" />
          </View>
          <View style={{ marginTop: 16 }}>
            <ListRow icon="home-outline" title="Assigned PG / Hostel" value={user?.metadata.pgName || '—'} />
            <ListRow icon="shield-checkmark-outline" title="Staff ID" value={user?.metadata.staffId || '—'} tint={colors.navy} />
            <ListRow icon="calendar-outline" title="Date of birth" value={user?.dateOfBirth || '—'} />
          </View>
        </Card>
        <>
          <Card>
            <Text style={styles.cardTitle}>Duty notes</Text>
            <Text style={styles.body}>
              Use Mess Tracker to toggle breakfast, lunch and dinner. Curfew logs after 22:00 are automatically flagged.
              Daily export aggregates present students, mess utilization and late arrivals for WhatsApp or email.
            </Text>
            <View style={{ marginTop: 12 }}>
              <DemoBadge text="Mess, RFID and gateway entries are demo / manual for now" />
            </View>
          </Card>
          <PrimaryButton title="Sign out" tone="ghost" icon="log-out-outline" onPress={logout} />
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
  body: { color: colors.muted, lineHeight: 20 },
});
