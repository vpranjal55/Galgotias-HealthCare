import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import LogoMark from '../components/LogoMark';
import { Chip, Field, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import type { Role } from '../lib/types';
import { DEMO_PASSWORD } from '../lib/seed';

type Props = NativeStackScreenProps<any>;

const HINTS: Record<Role, { label: string; placeholder: string; demo: string }> = {
  student: { label: 'Enrollment ID or college email', placeholder: '2500971520301', demo: '2500971520301' },
  warden: { label: 'Staff / Warden ID or email', placeholder: 'WRD104', demo: 'WRD104' },
  council: { label: 'Council / college email', placeholder: 'priya.nair@galgotiasuniversity.edu.in', demo: 'priya.nair@galgotiasuniversity.edu.in' },
};

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [loginId, setLoginId] = useState(HINTS.student.demo);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onRole = (r: Role) => {
    setRole(r);
    setLoginId(HINTS[r].demo);
    setError('');
  };

  const onSubmit = async () => {
    setError('');
    if (!loginId.trim() || !password) {
      setError('Enter your ID and password.');
      return;
    }
    setLoading(true);
    try {
      await login(loginId.trim(), password, role);
    } catch (e: any) {
      setError(e?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
         <View style={styles.col}>
          <LogoMark size={108} />
          <Text style={styles.welcome}>Sign in to continue</Text>
          <Text style={styles.lead}>Role-based access for students, wardens and the student council.</Text>

          <View style={styles.roleRow}>
            <Chip label="Student" active={role === 'student'} onPress={() => onRole('student')} />
            <Chip label="Warden / Staff" active={role === 'warden'} onPress={() => onRole('warden')} />
            <Chip label="Council" active={role === 'council'} onPress={() => onRole('council')} />
          </View>

          <View style={styles.form}>
            <Field
              label={HINTS[role].label}
              value={loginId}
              onChangeText={setLoginId}
              placeholder={HINTS[role].placeholder}
              icon={role === 'student' ? 'id-card-outline' : role === 'warden' ? 'shield-checkmark-outline' : 'briefcase-outline'}
              autoCapitalize="none"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secure={!show}
              icon="lock-closed-outline"
              right={
                <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
                  <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                </Pressable>
              }
            />
            {error ? (
              <View style={styles.errBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errText}>{error}</Text>
              </View>
            ) : null}
            <PrimaryButton title="Sign in" onPress={onSubmit} loading={loading} icon="log-in-outline" />
            <PrimaryButton
              title="Create an account"
              onPress={() => navigation.navigate('Register')}
              tone="ghost"
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Demo campus accounts</Text>
            <Text style={styles.demoLine}>Student  ·  2500971520301 (Aditya Tomar)  ·  {DEMO_PASSWORD}</Text>
            <Text style={styles.demoLine}>Student  ·  20231001234 (Ananya Sharma)</Text>
            <Text style={styles.demoLine}>Student  ·  2500971520203 (Taaha Siddiqui)</Text>
            <Text style={styles.demoLine}>Student  ·  2500971520144 (Pranjal Verma)</Text>
            <Text style={styles.demoLine}>Warden   ·  WRD104        ·  {DEMO_PASSWORD}</Text>
            <Text style={styles.demoLine}>Council  ·  priya.nair@galgotiasuniversity.edu.in</Text>
          </View>
         </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 480 },
  welcome: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.navy, marginTop: 18 },
  lead: { textAlign: 'center', color: colors.muted, marginTop: 6, marginBottom: 18, lineHeight: 20 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 },
  form: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errText: { color: colors.danger, fontWeight: '700', flex: 1, fontSize: 13 },
  demo: { marginTop: 22, padding: 14, borderRadius: 16, backgroundColor: '#fff7ea', borderWidth: 1, borderColor: '#f1d7a0' },
  demoTitle: { fontWeight: '800', color: colors.navy, marginBottom: 6 },
  demoLine: { color: colors.navySoft, fontSize: 12, marginTop: 2, fontWeight: '600' },
});
