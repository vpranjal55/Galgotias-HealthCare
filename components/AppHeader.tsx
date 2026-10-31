import React, { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from './ui';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead } from '../lib/db';
import { colors, radius } from '../lib/theme';
import type { NotificationItem } from '../lib/types';
import { useLayout } from '../lib/useLayout';

const logo = require('../assets/images/galgotias-logo.jpg');

export default function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useAuth();
  const { wide, narrow } = useLayout();
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const all = await getNotifications(user.id);
    // Students and wardens only see their own alerts; council also sees counselor-team alerts.
    setNotes(all.filter((n) => n.userId === user.id || (user.role === 'council' && n.userId.startsWith('mentor:'))));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unread = notes.filter((n) => !n.read).length;
  const first = user?.name.split(' ')[0];

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Image source={logo} style={styles.logo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>GALGOTIAS HEALTHCARE</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {wide && !narrow ? <Text style={styles.hello}>Hello, {first}</Text> : null}
        <Pressable onPress={() => setOpen(true)} style={styles.bell} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={20} color={colors.navy} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
        <Avatar name={user?.name} size={42} />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Alerts</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.navy} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {notes.length === 0 ? <Text style={styles.empty}>No alerts right now.</Text> : null}
              {notes.map((n) => (
                <Pressable key={n.id} onPress={() => markRead(n.id)} style={[styles.note, !n.read && styles.noteUnread]}>
                  <Ionicons
                    name={n.kind === 'alert' ? 'warning-outline' : n.kind === 'email' ? 'mail-outline' : 'notifications-outline'}
                    size={18}
                    color={n.kind === 'alert' ? colors.danger : colors.maroon}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteTitle}>{n.title}</Text>
                    <Text style={styles.noteBody}>{n.body}</Text>
                  </View>
                  {!n.read ? <View style={styles.dot} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.hint}>Tap an alert to mark it read.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.goldSoft, backgroundColor: colors.white },
  kicker: { fontSize: 10, letterSpacing: 2, fontWeight: '800', color: colors.maroon },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  sub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  hello: { fontWeight: '800', color: colors.navy, marginRight: 4 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(18,38,58,0.4)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: 16 },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: colors.white, borderRadius: radius.xl, padding: 18 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  empty: { color: colors.muted, paddingVertical: 20, textAlign: 'center' },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.line },
  noteUnread: { backgroundColor: colors.maroonTint, borderColor: colors.maroonSoft },
  noteTitle: { fontWeight: '800', color: colors.navy, fontSize: 13 },
  noteBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.maroon, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 6, textAlign: 'center' },
});
