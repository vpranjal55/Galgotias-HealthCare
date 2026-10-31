import type {
  Appointment,
  ChatMessage,
  CurfewLog,
  DailyExportSummary,
  HealthMetrics,
  MessLog,
  NotificationItem,
  RegisterPayload,
  Role,
  User,
} from './types';
import { getJSON, setJSON } from './storage';
import { getHealthConnectStatus, readHealthConnectDays } from './healthConnect';
import { hashPassword, isOfficialCollegeEmail, isValidEnrollmentId, isValidStaffId, verifyPassword } from './auth';
import { uid, todayISO, isLateEntry } from './ids';
import {
  SEED_USERS,
  seedAppointments,
  seedChats,
  seedCurfew,
  seedHealth,
  seedMess,
  seedNotifications,
} from './seed';
import {
  caloriesFromSteps,
  distanceFromSteps,
  evaluateHealthTrigger,
  physicalScoreFromActivity,
  weeklyScoreFromDays,
} from './triggers';
import { analyzeSentiment, botReply } from './sentiment';

let bootstrapped = false;

export async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  const seeded = await getJSON<boolean>('seeded', false);
  if (!seeded) {
    await setJSON('users', SEED_USERS);
    await setJSON('mess', seedMess());
    await setJSON('curfew', seedCurfew());
    await setJSON('health', seedHealth());
    await setJSON('chats', seedChats());
    await setJSON('appointments', seedAppointments());
    await setJSON('notifications', seedNotifications());
    await setJSON('seeded', true);
  } else {
    await ensureSeedAccounts();
  }
  bootstrapped = true;
}

/**
 * Non-destructive top-up for installs seeded before a demo account existed
 * (e.g. Aditya Tomar). Adds only missing seed users + their demo rows; never touches existing data.
 */
async function ensureSeedAccounts(): Promise<void> {
  const users = await getJSON<User[]>('users', []);
  const missing = SEED_USERS.filter(
    (seed) =>
      !users.some(
        (u) =>
          u.id === seed.id ||
          u.email.toLowerCase() === seed.email.toLowerCase() ||
          (!!seed.metadata.enrollmentId && u.metadata.enrollmentId === seed.metadata.enrollmentId) ||
          (!!seed.metadata.staffId && u.metadata.staffId === seed.metadata.staffId),
      ),
  );
  if (!missing.length) return;
  const ids = new Set(missing.map((m) => m.id));
  await setJSON('users', [...users, ...missing]);

  const health = await getJSON<HealthMetrics[]>('health', []);
  await setJSON('health', [...health, ...seedHealth().filter((h) => ids.has(h.studentId))]);
  const mess = await getJSON<MessLog[]>('mess', []);
  await setJSON('mess', [...mess, ...seedMess().filter((m) => ids.has(m.studentId))]);
  const curfew = await getJSON<CurfewLog[]>('curfew', []);
  await setJSON('curfew', [...curfew, ...seedCurfew().filter((c) => ids.has(c.studentId))]);
  const chats = await getJSON<ChatMessage[]>('chats', []);
  await setJSON('chats', [...chats, ...seedChats().filter((c) => ids.has(c.studentId))]);
  const notes = await getJSON<NotificationItem[]>('notifications', []);
  await setJSON('notifications', [...notes, ...seedNotifications().filter((n) => ids.has(n.userId))]);
}

export async function listUsers(): Promise<User[]> {
  await bootstrap();
  return getJSON<User[]>('users', []);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const users = await listUsers();
  return users.find((u) => u.id === id);
}

export async function findUserByLogin(loginId: string, roleHint?: Role): Promise<User | undefined> {
  const users = await listUsers();
  const q = loginId.trim().toLowerCase();
  return users.find((u) => {
    if (roleHint && u.role !== roleHint) return false;
    if (u.email.toLowerCase() === q) return true;
    if (u.metadata.enrollmentId?.toLowerCase() === q) return true;
    if (u.metadata.staffId?.toLowerCase() === q) return true;
    return false;
  });
}

export async function authenticate(loginId: string, password: string, roleHint?: Role): Promise<User> {
  const user = await findUserByLogin(loginId, roleHint);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials. Check your ID and password.');
  }
  return user;
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const users = await listUsers();
  const email = payload.email.trim().toLowerCase();

  if (!payload.name.trim() || payload.name.trim().length < 3) {
    throw new Error('Please enter your full name.');
  }
  if (!email.includes('@')) throw new Error('Enter a valid email address.');
  if (payload.password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!payload.dateOfBirth) throw new Error('Date of birth is required.');

  if (payload.role === 'council' && !isOfficialCollegeEmail(email)) {
    throw new Error('Council registration requires an official college email (@galgotiasuniversity.edu.in).');
  }
  if (payload.role === 'student') {
    if (!payload.enrollmentId || !isValidEnrollmentId(payload.enrollmentId)) {
      throw new Error('Enrollment ID must be 10–14 digits.');
    }
    if (!payload.course) throw new Error('Select the course you are pursuing.');
  }
  if (payload.role === 'warden') {
    if (!payload.staffId || !isValidStaffId(payload.staffId)) {
      throw new Error('Staff ID format: 2–5 letters followed by 2–6 digits (e.g. WRD104).');
    }
    if (!payload.pgName) throw new Error('Assigned PG / Hostel name is required.');
  }
  if (payload.role === 'council' && !payload.councilRole) {
    throw new Error('Please specify your council role / position.');
  }

  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error('An account with this email already exists.');
  }
  if (payload.enrollmentId && users.some((u) => u.metadata.enrollmentId === payload.enrollmentId)) {
    throw new Error('This Enrollment ID is already registered.');
  }
  if (payload.staffId && users.some((u) => u.metadata.staffId?.toLowerCase() === payload.staffId!.toLowerCase())) {
    throw new Error('This Staff ID is already registered.');
  }

  const user: User = {
    id: uid(payload.role.slice(0, 3)),
    name: payload.name.trim(),
    email,
    passwordHash: hashPassword(payload.password),
    role: payload.role,
    dateOfBirth: payload.dateOfBirth,
    createdAt: new Date().toISOString(),
    metadata: {
      enrollmentId: payload.enrollmentId,
      course: payload.course,
      hostelBlock: payload.role === 'student' ? 'Unassigned' : undefined,
      roomNumber: payload.role === 'student' ? '—' : undefined,
      mentorEmail: payload.role === 'student' ? 'counselor.meera@galgotiasuniversity.edu.in' : undefined,
      staffId: payload.staffId,
      pgName: payload.pgName,
      councilRole: payload.councilRole,
    },
  };
  await setJSON('users', [...users, user]);
  return user;
}

export async function students(): Promise<User[]> {
  return (await listUsers()).filter((u) => u.role === 'student');
}

export async function getMessLogs(date = todayISO()): Promise<MessLog[]> {
  await bootstrap();
  const all = await getJSON<MessLog[]>('mess', []);
  return all.filter((l) => l.date === date);
}

export async function toggleMeal(
  studentId: string,
  meal: MessLog['meal'],
  recordedBy: string,
  date = todayISO(),
): Promise<MessLog> {
  const all = await getJSON<MessLog[]>('mess', []);
  const idx = all.findIndex((l) => l.studentId === studentId && l.meal === meal && l.date === date);
  if (idx >= 0) {
    all[idx] = { ...all[idx], present: !all[idx].present, recordedBy, timestamp: new Date().toISOString() };
    await setJSON('mess', all);
    return all[idx];
  }
  const created: MessLog = {
    id: uid('mess'),
    studentId,
    date,
    meal,
    present: true,
    recordedBy,
    timestamp: new Date().toISOString(),
  };
  await setJSON('mess', [...all, created]);
  return created;
}

export async function getCurfewLogs(date = todayISO()): Promise<CurfewLog[]> {
  await bootstrap();
  const all = await getJSON<CurfewLog[]>('curfew', []);
  return all.filter((l) => l.date === date);
}

export async function logCurfew(input: {
  studentId: string;
  entryTime: string;
  expectedTime?: string;
  notes?: string;
  recordedBy: string;
}): Promise<CurfewLog> {
  const expected = input.expectedTime || '22:00';
  const all = await getJSON<CurfewLog[]>('curfew', []);
  const date = todayISO();
  const log: CurfewLog = {
    id: uid('cf'),
    studentId: input.studentId,
    date,
    entryTime: input.entryTime,
    expectedTime: expected,
    isLate: isLateEntry(input.entryTime, expected),
    recordedBy: input.recordedBy,
    notes: input.notes || '',
  };
  const next = all.filter((l) => !(l.studentId === input.studentId && l.date === date));
  next.push(log);
  await setJSON('curfew', next);
  return log;
}

export async function dailyExport(date = todayISO()): Promise<DailyExportSummary> {
  const stu = await students();
  const mess = await getMessLogs(date);
  const curfew = await getCurfewLogs(date);
  const count = (meal: MessLog['meal']) => mess.filter((m) => m.meal === meal && m.present).length;
  return {
    date,
    totalStudents: stu.length,
    presentCount: new Set(mess.filter((m) => m.present).map((m) => m.studentId)).size,
    messUtilization: {
      breakfast: count('breakfast'),
      lunch: count('lunch'),
      dinner: count('dinner'),
    },
    lateArrivals: curfew.filter((c) => c.isLate).length,
    onTime: curfew.filter((c) => !c.isLate).length,
    notReturned: Math.max(0, stu.length - curfew.length),
  };
}

export async function getHealth(studentId: string): Promise<HealthMetrics[]> {
  await bootstrap();
  const all = await getJSON<HealthMetrics[]>('health', []);
  return all.filter((h) => h.studentId === studentId).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function upsertHealthForDate(
  studentId: string,
  date: string,
  patch: Partial<HealthMetrics>,
  opts: { trigger?: boolean } = {},
): Promise<HealthMetrics> {
  const all = await getJSON<HealthMetrics[]>('health', []);
  const idx = all.findIndex((h) => h.studentId === studentId && h.date === date);
  const existing = idx >= 0 ? all[idx] : undefined;
  const steps = patch.steps ?? existing?.steps ?? 0;
  const calories = patch.calories ?? existing?.calories ?? caloriesFromSteps(steps);
  const distanceKm = patch.distanceKm ?? existing?.distanceKm ?? distanceFromSteps(steps);
  const physicalScore = physicalScoreFromActivity(steps, calories);
  const mentalScore = patch.mentalScore ?? existing?.mentalScore ?? 62;
  const row: HealthMetrics = {
    id: existing?.id || uid('hm'),
    studentId,
    date,
    steps,
    distanceKm,
    calories,
    mentalScore,
    physicalScore,
    weeklyScore: 0,
    mood: patch.mood ?? existing?.mood ?? 'okay',
    lastChatSummary: patch.lastChatSummary ?? existing?.lastChatSummary,
    source: patch.source ?? existing?.source,
    heartRateBpm: 'heartRateBpm' in patch ? patch.heartRateBpm : existing?.heartRateBpm,
    derivedFields: 'derivedFields' in patch ? patch.derivedFields : existing?.derivedFields,
  };
  const without = all.filter((h) => !(h.studentId === studentId && h.date === date));
  const studentDays = [row, ...without.filter((h) => h.studentId === studentId)].sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );
  row.weeklyScore = weeklyScoreFromDays(studentDays);
  await setJSON('health', [...without, row]);
  if (opts.trigger !== false) await maybeTrigger(studentId, row);
  return row;
}

export async function upsertTodayHealth(studentId: string, patch: Partial<HealthMetrics>): Promise<HealthMetrics> {
  return upsertHealthForDate(studentId, todayISO(), patch);
}

export async function latestHealthByStudent(): Promise<Record<string, HealthMetrics | undefined>> {
  await bootstrap();
  const all = await getJSON<HealthMetrics[]>('health', []);
  const out: Record<string, HealthMetrics | undefined> = {};
  all.forEach((h) => {
    const cur = out[h.studentId];
    if (!cur || cur.date < h.date) out[h.studentId] = h;
  });
  return out;
}

export interface HcSyncResult {
  ok: boolean;
  daysWritten: number;
  message: string;
}

export async function getHcLastSync(studentId: string): Promise<string | null> {
  const map = await getJSON<Record<string, string>>('hcSync', {});
  return map[studentId] ?? null;
}

/**
 * Pull the last 7 days from Android Health Connect and store them against the student.
 * Only real device readings are written (source: 'health_connect'). Days with 0 steps are skipped
 * (no data), so an unworn phone can never drag the wellness score down and fire a counselor trigger.
 */
export async function syncHealthConnect(studentId: string): Promise<HcSyncResult> {
  const status = await getHealthConnectStatus();
  if (status.state !== 'connected') {
    return { ok: false, daysWritten: 0, message: status.detail };
  }
  const days = await readHealthConnectDays(7);
  let written = 0;
  for (const d of days) {
    if (!d.steps || d.steps <= 0) continue;
    const derived: Array<'distance' | 'calories'> = [];
    const distanceKm = d.distanceKm ?? (derived.push('distance'), distanceFromSteps(d.steps));
    const calories = d.activeCalories ?? (derived.push('calories'), caloriesFromSteps(d.steps));
    await upsertHealthForDate(
      studentId,
      d.date,
      {
        steps: d.steps,
        distanceKm,
        calories,
        heartRateBpm: d.heartRateAvg ?? undefined,
        derivedFields: derived.length ? derived : undefined,
        source: 'health_connect',
      },
      // Never fire counselor triggers from a device sync: today is partial and past days may be incomplete.
      { trigger: false },
    );
    written += 1;
  }
  const map = await getJSON<Record<string, string>>('hcSync', {});
  await setJSON('hcSync', { ...map, [studentId]: new Date().toISOString() });
  return {
    ok: true,
    daysWritten: written,
    message: written
      ? `Synced ${written} day${written === 1 ? '' : 's'} from Health Connect.`
      : 'Connected, but Health Connect has no step data for the last 7 days yet.',
  };
}

export async function addSteps(studentId: string, extra = 250): Promise<HealthMetrics> {
  const days = await getHealth(studentId);
  const today = days.find((d) => d.date === todayISO());
  // Simulated pedometer tick for the campus demo — always tagged 'demo', never presented as device data.
  // trigger:false — a simulated tick must never raise a real counselor alert.
  return upsertHealthForDate(studentId, todayISO(), { steps: (today?.steps || 0) + extra, source: 'demo' }, { trigger: false });
}

export async function getChats(studentId: string): Promise<ChatMessage[]> {
  await bootstrap();
  const all = await getJSON<ChatMessage[]>('chats', []);
  return all.filter((c) => c.studentId === studentId);
}

export async function sendChat(studentId: string, text: string, studentName: string): Promise<ChatMessage[]> {
  const all = await getJSON<ChatMessage[]>('chats', []);
  const analysis = analyzeSentiment(text);
  const userMsg: ChatMessage = {
    id: uid('ch'),
    studentId,
    role: 'user',
    text,
    sentiment: analysis.sentiment,
    scoreImpact: analysis.score,
    createdAt: new Date().toISOString(),
  };
  const botMsg: ChatMessage = {
    id: uid('ch'),
    studentId,
    role: 'bot',
    text: botReply(text, analysis, studentName),
    createdAt: new Date().toISOString(),
  };
  const next = [...all, userMsg, botMsg];
  await setJSON('chats', next);

  const days = await getHealth(studentId);
  const today = days.find((d) => d.date === todayISO());
  const blended = Math.round(((today?.mentalScore ?? 62) * 0.55 + analysis.score * 0.45));
  await upsertTodayHealth(studentId, {
    mentalScore: blended,
    mood: analysis.sentiment,
    lastChatSummary: text.slice(0, 140),
  });

  return next.filter((c) => c.studentId === studentId);
}

export async function getAppointments(studentId?: string): Promise<Appointment[]> {
  await bootstrap();
  const all = await getJSON<Appointment[]>('appointments', []);
  const filtered = studentId ? all.filter((a) => a.studentId === studentId) : all;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function requestAppointment(studentId: string, reason: string): Promise<Appointment> {
  const student = await findUserById(studentId);
  if (!student) throw new Error('Student not found');
  const health = await getHealth(studentId);
  const score = health[0]?.weeklyScore ?? 62;
  const apt: Appointment = {
    id: uid('apt'),
    studentId,
    counselorEmail: student.metadata.mentorEmail || 'counselor@galgotiasuniversity.edu.in',
    counselorName: 'Campus Wellness Counselor',
    reason,
    status: 'pending',
    source: 'manual',
    healthScore: score,
    createdAt: new Date().toISOString(),
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  const all = await getJSON<Appointment[]>('appointments', []);
  await setJSON('appointments', [apt, ...all]);
  await pushNotification({
    id: uid('ntf'),
    userId: studentId,
    title: 'Counselor session requested',
    body: `Your request has been sent to ${apt.counselorEmail}. We'll confirm shortly.`,
    kind: 'email',
    read: false,
    createdAt: new Date().toISOString(),
    relatedAppointmentId: apt.id,
  });
  return apt;
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
  const all = await getJSON<Appointment[]>('appointments', []);
  await setJSON(
    'appointments',
    all.map((a) => (a.id === id ? { ...a, status } : a)),
  );
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  await bootstrap();
  const all = await getJSON<NotificationItem[]>('notifications', []);
  return all
    .filter((n) => n.userId === userId || n.userId.startsWith('mentor:'))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function markNotificationRead(id: string): Promise<void> {
  const all = await getJSON<NotificationItem[]>('notifications', []);
  await setJSON(
    'notifications',
    all.map((n) => (n.id === id ? { ...n, read: true } : n)),
  );
}

async function pushNotification(n: NotificationItem): Promise<void> {
  const all = await getJSON<NotificationItem[]>('notifications', []);
  await setJSON('notifications', [n, ...all]);
}

async function maybeTrigger(studentId: string, metrics: HealthMetrics): Promise<void> {
  const student = await findUserById(studentId);
  if (!student) return;
  const existing = await getAppointments(studentId);
  const history = await getHealth(studentId);
  const today = todayISO();
  const completeActivityDays = history.filter(
    // Only real Health Connect days count as verified activity; demo/simulated days never qualify.
    (h) => h.date !== today && h.steps > 0 && h.source === 'health_connect',
  ).length;
  const result = evaluateHealthTrigger(student, metrics, existing, { completeActivityDays });
  if (!result.triggered || !result.appointment) return;
  const apts = await getJSON<Appointment[]>('appointments', []);
  await setJSON('appointments', [result.appointment, ...apts]);
  const notes = await getJSON<NotificationItem[]>('notifications', []);
  await setJSON('notifications', [...result.notifications, ...notes]);
}

export function exportSummaryText(summary: DailyExportSummary): string {
  return [
    `Galgotias HealthCare — Daily Hostel Log`,
    `Date: ${summary.date}`,
    `Students on roll: ${summary.totalStudents}`,
    `Mess unique diners: ${summary.presentCount}`,
    `Breakfast: ${summary.messUtilization.breakfast}  Lunch: ${summary.messUtilization.lunch}  Dinner: ${summary.messUtilization.dinner}`,
    `On-time returns: ${summary.onTime}  Late: ${summary.lateArrivals}  Not returned: ${summary.notReturned}`,
    `Generated by Galgotias College Healthcare & Hostel Management`,
  ].join('\n');
}

export function weeklyReportText(user: User, days: HealthMetrics[]): string {
  const latest = days[0];
  const avgSteps = days.length ? Math.round(days.reduce((s, d) => s + d.steps, 0) / days.length) : 0;
  return [
    `Galgotias HealthCare — Weekly Health Report`,
    `Student: ${user.name}`,
    `Enrollment: ${user.metadata.enrollmentId || '—'}`,
    `Course: ${user.metadata.course || '—'}`,
    `Weekly Health Score: ${latest?.weeklyScore ?? '—'}%`,
    `Mental: ${latest?.mentalScore ?? '—'}%   Physical: ${latest?.physicalScore ?? '—'}%`,
    `Avg daily steps: ${avgSteps.toLocaleString('en-IN')}`,
    `Mood today: ${latest?.mood || '—'}`,
    `Data source: ${
      latest?.source === 'health_connect'
        ? days.slice(0, 7).some((d) => d.source !== 'health_connect')
          ? 'Android Health Connect (device data) mixed with campus demo days'
          : 'Android Health Connect (device data)'
        : 'Campus demo data'
    }`,
    ``,
    `Shared from the Galgotias College Healthcare & Hostel Management App.`,
  ].join('\n');
}
