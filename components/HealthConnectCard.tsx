import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, Pill, PrimaryButton } from './ui';
import { getHcLastSync, syncHealthConnect } from '../lib/db';
import {
  connectHealthConnect,
  getHealthConnectStatus,
  openHealthConnectSettings,
} from '../lib/healthConnect';
import type { HcStatus } from '../lib/healthConnect.types';
import { colors, radius } from '../lib/theme';

interface Props {
  studentId: string;
  /** Called after a successful device sync so the dashboard can reload. */
  onSynced?: () => void;
  /** Called whenever the connection status becomes known. */
  onStatus?: (s: HcStatus) => void;
}

function agoLabel(iso: string | null): string {
  if (!iso) return 'Never synced';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `Synced ${h} h ago`;
  return `Synced ${new Date(iso).toLocaleDateString('en-IN')}`;
}

export default function HealthConnectCard({ studentId, onSynced, onStatus }: Props) {
  const [status, setStatus] = useState<HcStatus | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    const s = await getHealthConnectStatus();
    setStatus(s);
    onStatus?.(s);
    setLastSync(await getHcLastSync(studentId));
  }, [studentId, onStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doSync = async () => {
    setBusy(true);
    setNote('');
    try {
      const r = await syncHealthConnect(studentId);
      setNote(r.message);
      if (r.ok) onSynced?.();
      setLastSync(await getHcLastSync(studentId));
    } finally {
      setBusy(false);
    }
  };

  const doConnect = async () => {
    setBusy(true);
    setNote('');
    try {
      const s = await connectHealthConnect();
      setStatus(s);
      onStatus?.(s);
      if (s.state === 'connected') {
        const r = await syncHealthConnect(studentId);
        setNote(r.message);
        if (r.ok) onSynced?.();
        setLastSync(await getHcLastSync(studentId));
        if ((s.missing ?? []).length) setNote((n) => `${n} Still not granted: ${(s.missing ?? []).join(', ')}.`.trim());
      } else if (s.state === 'permissions-needed') {
        setNote('Permission was not granted. You can try again any time.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <Card>
        <Text style={styles.title}>Health Connect</Text>
        <Text style={styles.detail}>Checking connection…</Text>
      </Card>
    );
  }

  const connected = status.state === 'connected';
  const missing = status.missing ?? [];
  const partial = connected && missing.length > 0;
  const tone = connected ? 'success' : status.state === 'permissions-needed' ? 'warning' : 'neutral';
  const icon = connected ? 'checkmark-circle' : Platform.OS === 'android' ? 'link-outline' : 'information-circle-outline';

  return (
    <Card>
      <View style={styles.head}>
        <View style={[styles.icon, connected && { backgroundColor: colors.successSoft }]}>
          <Ionicons name={icon as any} size={22} color={connected ? colors.success : colors.maroon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Health Connect</Text>
          <Text style={styles.status}>{status.title}</Text>
        </View>
        <Pill text={partial ? 'PARTIAL ACCESS' : connected ? 'REAL DATA' : 'NOT CONNECTED'} tone={partial ? 'warning' : tone} />
      </View>
      <Text style={styles.detail}>{status.detail}</Text>

      {connected ? (
        <>
          <Text style={styles.meta}>
            {agoLabel(lastSync)} · access: {status.granted.length ? status.granted.join(', ') : 'none'}
          </Text>
          {partial ? (
            <PrimaryButton
              title="Grant missing permissions"
              icon="shield-checkmark-outline"
              tone="navy"
              onPress={doConnect}
              loading={busy}
              style={{ marginTop: 12 }}
            />
          ) : null}
          <PrimaryButton title="Sync now" icon="sync-outline" onPress={doSync} loading={busy} style={{ marginTop: 12 }} />
          <PrimaryButton title="Manage in Health Connect" tone="ghost" onPress={openHealthConnectSettings} style={{ marginTop: 8 }} />
        </>
      ) : null}

      {status.state === 'permissions-needed' ? (
        <>
          <PrimaryButton title="Connect Health Connect" icon="heart-outline" onPress={doConnect} loading={busy} style={{ marginTop: 12 }} />
          {status.granted.length ? (
            <PrimaryButton title="Manage in Health Connect" tone="ghost" onPress={openHealthConnectSettings} style={{ marginTop: 8 }} />
          ) : null}
        </>
      ) : null}

      {status.state === 'provider-update-required' ? (
        <PrimaryButton title="Open Google Play" icon="logo-google-playstore" onPress={openHealthConnectSettings} style={{ marginTop: 12 }} />
      ) : null}

      {status.state === 'error' ? (
        <PrimaryButton title="Try again" tone="ghost" onPress={refresh} style={{ marginTop: 12 }} />
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.maroonTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  status: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 1 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  meta: { color: colors.navy, fontSize: 12, fontWeight: '700', marginTop: 10 },
  note: {
    marginTop: 10,
    backgroundColor: colors.creamCard,
    borderRadius: radius.md,
    padding: 10,
    color: colors.navy,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
});
