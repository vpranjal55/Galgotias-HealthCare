import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { PrimaryButton } from '../../components/ui';
import { layout } from '../../lib/theme';
import { useLayout } from '../../lib/useLayout';
import { useAuth } from '../../context/AuthContext';
import { getAppointments, getChats, requestAppointment, sendChat } from '../../lib/db';
import { colors } from '../../lib/theme';
import type { Appointment, ChatMessage } from '../../lib/types';

const PROMPTS = [
  "I'm feeling stressed about exams",
  "I'm happy and motivated today",
  'I feel lonely in the hostel',
  "I'm okay, just a regular day",
];

export default function WellnessChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apts, setApts] = useState<Appointment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList>(null);
  const { wide } = useLayout();

  const load = useCallback(async () => {
    if (!user) return;
    const [c, a] = await Promise.all([getChats(user.id), getAppointments(user.id)]);
    setMessages(c);
    setApts(a);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submit = async (text: string) => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    setDraft('');
    const next = await sendChat(user.id, text.trim(), user.name);
    setMessages(next);
    setApts(await getAppointments(user.id));
    setSending(false);
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
  };

  const book = async () => {
    if (!user) return;
    await requestAppointment(user.id, 'Student requested a confidential wellness session from the chatbot.');
    setApts(await getAppointments(user.id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
     <View style={{ flex: 1, width: '100%', maxWidth: Math.min(layout.maxContent, wide ? 860 : layout.maxContent), alignSelf: 'center' }}>
      <View style={{ paddingHorizontal: wide ? 28 : 16, paddingTop: wide ? 20 : 8, paddingBottom: 6 }}>
        <AppHeader title="AI Wellness Companion" subtitle="Confidential · Sentiment scored daily" />
      </View>
      {apts[0] && (apts[0].status === 'pending' || apts[0].status === 'scheduled') ? (
        <View style={styles.banner}>
          <Ionicons name="medkit-outline" size={16} color={colors.warning} />
          <Text style={styles.bannerText}>
            {apts[0].source === 'auto' ? 'Auto-alert sent to your counselor.' : 'Session request is pending.'}
          </Text>
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={12}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>How are you feeling, {user?.name.split(' ')[0]}?</Text>
              <Text style={styles.emptyBody}>
                I look at the language you use to estimate a daily mental-health score. If it drops to 50% or below, I
                automatically request a counselor appointment.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
              <Text style={[styles.bubbleText, item.role === 'user' && { color: colors.white }]}>{item.text}</Text>
              {item.sentiment ? (
                <Text style={[styles.sent, item.role === 'user' && { color: '#f8d7c4' }]}>
                  {item.sentiment} · impact {item.scoreImpact}
                </Text>
              ) : null}
            </View>
          )}
        />
        <View style={styles.prompts}>
          {PROMPTS.map((p) => (
            <Pressable key={p} onPress={() => submit(p)} style={styles.prompt}>
              <Text style={styles.promptText}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Share how you feel…"
            placeholderTextColor="#9AA3AF"
            style={styles.input}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => submit(draft)}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
                e.preventDefault?.();
                submit(draft);
              }
            }}
          />
          <Pressable onPress={() => submit(draft)} style={styles.send}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <PrimaryButton title="Request counselor appointment" tone="navy" icon="heart-outline" onPress={book} />
        </View>
      </KeyboardAvoidingView>
     </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '86%', padding: 14, borderRadius: 22, marginBottom: 10 },
  bot: { backgroundColor: colors.white, borderTopLeftRadius: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line },
  user: { backgroundColor: colors.maroon, borderTopRightRadius: 4, alignSelf: 'flex-end' },
  bubbleText: { color: colors.navy, lineHeight: 20, fontSize: 14 },
  sent: { marginTop: 6, fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  empty: { padding: 16 },
  emptyTitle: { fontWeight: '800', fontSize: 18, color: colors.navy },
  emptyBody: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  prompt: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.line },
  promptText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: { flex: 1, color: colors.navy, fontWeight: '700', fontSize: 12 },
});
