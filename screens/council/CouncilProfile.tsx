import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import { Cols, Page } from '../../components/Page';
import { Avatar, Card, ListRow, Pill, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../lib/theme';

export default function CouncilProfile() {
  const { user, logout } = useAuth();
  return (
    <Page>
      <AppHeader title="Council profile" subtitle="Official college mail verified" />
      <Cols ratios={[1, 1]}>
        <Card>
          <View style={styles.head}>
            <Avatar name={user?.name} size={64} tone="navy" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Pill text="COUNCIL" tone="success" />
            <Pill text={user?.metadata.councilRole || 'Member'} tone="neutral" />
          </View>
          <View style={{ marginTop: 16 }}>
            <ListRow icon="calendar-outline" title="Date of birth" value={user?.dateOfBirth || '—'} />
          </View>
        </Card>
        <>
          <Card>
            <Text style={styles.cardTitle}>Mandate</Text>
            <Text style={styles.body}>
              Oversee hostel welfare, review automated counselor triggers when a student's weekly health score drops to
              50% or below, and keep the campus directory accurate.
            </Text>
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
