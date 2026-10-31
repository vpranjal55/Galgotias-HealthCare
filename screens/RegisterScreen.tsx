import React, { useMemo, useState } from 'react';
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
import type { Role, StaffSubRole } from '../lib/types';

type Props = NativeStackScreenProps<any>;

const COURSES = [
  'B.Tech Computer Science',
  'B.Tech Artificial Intelligence',
  'B.Tech Mechanical',
  'BBA',
  'BCA',
  'BA Journalism',
  'MBA',
  'MCA',
];

const HOSTELS = ['Asha PG – Block A', 'Asha PG – Block B', 'Krishna Boys Hostel', 'Saraswati Girls Hostel', 'Faculty Residences'];

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [kind, setKind] = useState<'student' | 'professional'>('student');
  const [sub, setSub] = useState<StaffSubRole>('warden');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [dob, setDob] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [course, setCourse] = useState(COURSES[0]);
  const [staffId, setStaffId] = useState('');
  const [pgName, setPgName] = useState(HOSTELS[1]);
  const [councilRole, setCouncilRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role: Role = kind === 'student' ? 'student' : sub;

  const eye = (
    <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
      <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
    </Pressable>
  );

  const heading = useMemo(() => {
    if (kind === 'student') return 'Student registration';
    if (sub === 'warden') return 'Warden / Hostel staff';
    return 'Council team member';
  }, [kind, sub]);

  const onSubmit = async () => {
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        role,
        name,
        email,
        password,
        dateOfBirth: dob,
        enrollmentId: role === 'student' ? enrollmentId : undefined,
        course: role === 'student' ? course : undefined,
        staffId: role === 'warden' ? staffId : undefined,
        pgName: role === 'warden' ? pgName : undefined,
        councilRole: role === 'council' ? councilRole : undefined,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
         <View style={styles.col}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color={colors.maroon} />
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>
          <LogoMark size={72} compact />
          <Text style={styles.welcome}>{heading}</Text>
          <Text style={styles.lead}>The form adapts to your role so you only fill what we need.</Text>

          <View style={styles.roleRow}>
            <Chip label="Student" active={kind === 'student'} onPress={() => setKind('student')} />
            <Chip
              label="Working professional"
              active={kind === 'professional'}
              onPress={() => setKind('professional')}
            />
          </View>

          {kind === 'professional' ? (
            <View style={[styles.roleRow, { marginTop: -6 }]}>
              <Chip label="Warden (Hostel / Mess)" active={sub === 'warden'} onPress={() => setSub('warden')} />
              <Chip label="Council Team" active={sub === 'council'} onPress={() => setSub('council')} />
            </View>
          ) : null}

          <View style={styles.form}>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="As on college ID" icon="person-outline" autoCapitalize="words" />

            {role === 'student' ? (
              <>
                <Field
                  label="Enrollment ID"
                  value={enrollmentId}
                  onChangeText={setEnrollmentId}
                  placeholder="10–14 digit ID"
                  icon="id-card-outline"
                  keyboardType="number-pad"
                />
                <Field
                  label="College email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@galgotiasuniversity.edu.in"
                  icon="mail-outline"
                  keyboardType="email-address"
                />
              </>
            ) : null}

            {role === 'warden' ? (
              <>
                <Field
                  label="Staff email ID"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="staff@galgotiasuniversity.edu.in"
                  icon="mail-outline"
                  keyboardType="email-address"
                />
                <Field
                  label="Staff / Warden ID"
                  value={staffId}
                  onChangeText={setStaffId}
                  placeholder="WRD104"
                  icon="shield-checkmark-outline"
                  autoCapitalize="none"
                />
              </>
            ) : null}

            {role === 'council' ? (
              <Field
                label="Council / college mail ID"
                value={email}
                onChangeText={setEmail}
                placeholder="must be @galgotiasuniversity.edu.in"
                icon="mail-outline"
                keyboardType="email-address"
              />
            ) : null}

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              secure={!show}
              icon="lock-closed-outline"
              right={eye}
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
              secure={!show}
              icon="lock-closed-outline"
            />
            <Field
              label="Date of birth"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              icon="calendar-outline"
            />

            {role === 'student' ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.label}>Course currently pursuing</Text>
                <View style={styles.wrapChips}>
                  {COURSES.map((c) => (
                    <Chip key={c} label={c} active={course === c} onPress={() => setCourse(c)} />
                  ))}
                </View>
              </View>
            ) : null}

            {role === 'warden' ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.label}>PG / Hostel assigned</Text>
                <View style={styles.wrapChips}>
                  {HOSTELS.map((h) => (
                    <Chip key={h} label={h} active={pgName === h} onPress={() => setPgName(h)} />
                  ))}
                </View>
              </View>
            ) : null}

            {role === 'council' ? (
              <Field
                label="Council role / position"
                value={councilRole}
                onChangeText={setCouncilRole}
                placeholder="e.g. Student Welfare Secretary"
                icon="ribbon-outline"
                autoCapitalize="words"
              />
            ) : null}

            {error ? (
              <View style={styles.errBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton title="Create account" onPress={onSubmit} loading={loading} icon="checkmark-circle-outline" />
          </View>
         </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 22, paddingBottom: 48, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backText: { color: colors.maroon, fontWeight: '700' },
  welcome: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.navy, marginTop: 10 },
  lead: { textAlign: 'center', color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  form: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
});
