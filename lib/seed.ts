import type {
  Appointment,
  ChatMessage,
  CurfewLog,
  HealthMetrics,
  MessLog,
  NotificationItem,
  User,
} from './types';
import { hashPassword } from './auth';
import { daysAgoISO, todayISO } from './ids';
import { caloriesFromSteps, distanceFromSteps, physicalScoreFromActivity, weeklyScoreFromDays } from './triggers';

export const DEMO_PASSWORD = 'Galgotias@123';

function u(
  id: string,
  name: string,
  email: string,
  role: User['role'],
  dob: string,
  metadata: User['metadata'],
): User {
  return {
    id,
    name,
    email,
    passwordHash: hashPassword(DEMO_PASSWORD),
    role,
    dateOfBirth: dob,
    createdAt: '2025-08-12T09:00:00.000Z',
    metadata,
  };
}

export const SEED_USERS: User[] = [
  u('stu_ananya', 'Ananya Sharma', 'ananya.sharma@galgotiasuniversity.edu.in', 'student', '2004-04-18', {
    enrollmentId: '20231001234',
    course: 'B.Tech Computer Science',
    hostelBlock: 'Asha PG – Block B',
    roomNumber: 'B-214',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_rahul', 'Rahul Verma', 'rahul.verma@galgotiasuniversity.edu.in', 'student', '2003-11-02', {
    enrollmentId: '20231004567',
    course: 'BBA',
    hostelBlock: 'Krishna Boys Hostel',
    roomNumber: 'K-108',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_isha', 'Isha Patel', 'isha.patel@galgotiasuniversity.edu.in', 'student', '2004-07-29', {
    enrollmentId: '20231007890',
    course: 'B.Tech Artificial Intelligence',
    hostelBlock: 'Asha PG – Block A',
    roomNumber: 'A-031',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_arjun', 'Arjun Singh', 'arjun.singh@galgotiasuniversity.edu.in', 'student', '2003-01-15', {
    enrollmentId: '20221003321',
    course: 'B.Tech Mechanical',
    hostelBlock: 'Krishna Boys Hostel',
    roomNumber: 'K-402',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_mehak', 'Mehak Khan', 'mehak.khan@galgotiasuniversity.edu.in', 'student', '2004-09-08', {
    enrollmentId: '20231009111',
    course: 'BA Journalism',
    hostelBlock: 'Asha PG – Block B',
    roomNumber: 'B-119',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_taaha', 'Taaha Siddiqui', 'taaha.siddiqui@galgotiasuniversity.edu.in', 'student', '2006-02-11', {
    enrollmentId: '2500971520203',
    course: 'B.Tech Computer Science',
    hostelBlock: 'Krishna Boys Hostel',
    roomNumber: 'K-221',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_pranjal', 'Pranjal Verma', 'pranjal.verma@galgotiasuniversity.edu.in', 'student', '2006-08-03', {
    enrollmentId: '2500971520144',
    course: 'B.Tech Artificial Intelligence',
    hostelBlock: 'Krishna Boys Hostel',
    roomNumber: 'K-222',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('stu_aditya', 'Aditya Tomar', 'aditya.tomar@galgotiasuniversity.edu.in', 'student', '2005-05-20', {
    enrollmentId: '2500971520301',
    course: 'B.Tech Computer Science',
    hostelBlock: 'Krishna Boys Hostel',
    roomNumber: 'K-310',
    mentorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
  }),
  u('wrd_neha', 'Neha Gupta', 'neha.gupta@galgotiasuniversity.edu.in', 'warden', '1988-03-21', {
    staffId: 'WRD104',
    pgName: 'Asha PG – Block B',
  }),
  u('wrd_vikram', 'Vikram Yadav', 'vikram.yadav@galgotiasuniversity.edu.in', 'warden', '1984-12-05', {
    staffId: 'WRD221',
    pgName: 'Krishna Boys Hostel',
  }),
  u('cnc_priya', 'Priya Nair', 'priya.nair@galgotiasuniversity.edu.in', 'council', '2002-06-14', {
    councilRole: 'Student Welfare Secretary',
  }),
];

function buildHealthFor(studentId: string, pattern: number[]): HealthMetrics[] {
  const days: HealthMetrics[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const steps = pattern[6 - i];
    const calories = caloriesFromSteps(steps);
    const distanceKm = distanceFromSteps(steps);
    const physicalScore = physicalScoreFromActivity(steps, calories);
    const mentalBase =
      studentId === 'stu_rahul' || studentId === 'stu_pranjal'
        ? 38 + i * 2
        : studentId === 'stu_isha'
          ? 72 + (i % 3) * 4
          : 64 + (i % 4) * 5;
    days.push({
      id: `hm_${studentId}_${i}`,
      studentId,
      date: daysAgoISO(i),
      steps,
      distanceKm,
      calories,
      mentalScore: Math.min(96, mentalBase),
      physicalScore,
      weeklyScore: 0,
      mood: mentalBase < 50 ? 'low' : mentalBase < 70 ? 'okay' : 'good',
      source: 'demo',
    });
  }
  const withWeekly = days.map((d, idx, arr) => ({
    ...d,
    weeklyScore: weeklyScoreFromDays(arr.slice(0, idx + 1).reverse()),
  }));
  return withWeekly;
}

export function seedHealth(): HealthMetrics[] {
  return [
    ...buildHealthFor('stu_ananya', [7421, 8102, 6900, 9204, 4310, 8801, 6540]),
    ...buildHealthFor('stu_rahul', [2100, 1804, 2500, 1200, 900, 1600, 1400]),
    ...buildHealthFor('stu_isha', [10211, 9800, 11140, 8700, 9400, 12010, 9900]),
    ...buildHealthFor('stu_arjun', [5400, 6100, 4800, 7200, 3900, 8000, 5600]),
    ...buildHealthFor('stu_mehak', [6700, 7100, 6400, 5900, 8200, 7600, 7000]),
    ...buildHealthFor('stu_taaha', [8120, 7640, 9010, 6880, 8450, 9320, 7900]),
    ...buildHealthFor('stu_aditya', [8420, 9650, 7310, 10840, 6980, 9120, 8260]),
    ...buildHealthFor('stu_pranjal', [1800, 1500, 2100, 1100, 900, 1400, 1200]).map((d) => ({
      ...d,
      mentalScore: 42,
      weeklyScore: 42,
      mood: 'low',
    })),
  ];
}

export function seedMess(): MessLog[] {
  const meals: MessLog['meal'][] = ['breakfast', 'lunch', 'dinner'];
  const students = SEED_USERS.filter((u) => u.role === 'student');
  const logs: MessLog[] = [];
  students.forEach((s, si) => {
    meals.forEach((meal, mi) => {
      const present = !(s.id === 'stu_rahul' && meal === 'breakfast') && !(si === 3 && mi === 2);
      logs.push({
        id: `mess_${s.id}_${meal}`,
        studentId: s.id,
        date: todayISO(),
        meal,
        present,
        recordedBy: 'wrd_neha',
        timestamp: new Date().toISOString(),
      });
    });
  });
  return logs;
}

export function seedCurfew(): CurfewLog[] {
  return [
    {
      id: 'cf_ananya',
      studentId: 'stu_ananya',
      date: todayISO(),
      entryTime: '21:18',
      expectedTime: '22:00',
      isLate: false,
      recordedBy: 'wrd_neha',
      notes: 'Returned after library.',
    },
    {
      id: 'cf_rahul',
      studentId: 'stu_rahul',
      date: todayISO(),
      entryTime: '22:47',
      expectedTime: '22:00',
      isLate: true,
      recordedBy: 'wrd_vikram',
      notes: 'Late from city outing. Warned.',
    },
    {
      id: 'cf_isha',
      studentId: 'stu_isha',
      date: todayISO(),
      entryTime: '20:55',
      expectedTime: '22:00',
      isLate: false,
      recordedBy: 'wrd_neha',
      notes: '',
    },
    {
      id: 'cf_aditya',
      studentId: 'stu_aditya',
      date: todayISO(),
      entryTime: '21:35',
      expectedTime: '22:00',
      isLate: false,
      recordedBy: 'wrd_vikram',
      notes: 'Returned from sports ground.',
    },
    {
      id: 'cf_arjun',
      studentId: 'stu_arjun',
      date: todayISO(),
      entryTime: '22:12',
      expectedTime: '22:00',
      isLate: true,
      recordedBy: 'wrd_vikram',
      notes: 'Lab overtime – verified.',
    },
  ];
}

export function seedChats(): ChatMessage[] {
  return [
    {
      id: 'ch1',
      studentId: 'stu_ananya',
      role: 'bot',
      text: 'Hi Ananya, I am your Galgotias wellness companion. How are you feeling today?',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 'ch_aditya1',
      studentId: 'stu_aditya',
      role: 'bot',
      text: 'Hi Aditya, I am your Galgotias wellness companion. How are you feeling today?',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];
}

export function seedAppointments(): Appointment[] {
  return [
    {
      id: 'apt_rahul_auto',
      studentId: 'stu_rahul',
      counselorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
      counselorName: 'Campus Wellness Counselor',
      reason:
        'Weekly/daily health score dropped to 42% (threshold 50%). Auto-scheduled support session.',
      status: 'pending',
      source: 'auto',
      healthScore: 42,
      createdAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'apt_pranjal_auto',
      studentId: 'stu_pranjal',
      counselorEmail: 'counselor.meera@galgotiasuniversity.edu.in',
      counselorName: 'Campus Wellness Counselor',
      reason:
        'Weekly/daily health score dropped to 42% (threshold 50%). Auto-scheduled support session.',
      status: 'pending',
      source: 'auto',
      healthScore: 42,
      createdAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function seedNotifications(): NotificationItem[] {
  return [
    {
      id: 'nt_welcome',
      userId: 'stu_ananya',
      title: 'Welcome to Galgotias HealthCare',
      body: 'Track meals, curfew, steps and mental wellness in one place. Your counselor is one tap away.',
      kind: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'nt_welcome_aditya',
      userId: 'stu_aditya',
      title: 'Welcome to Galgotias HealthCare',
      body: 'Track meals, curfew, steps and mental wellness in one place. Your counselor is one tap away.',
      kind: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'nt_rahul_student',
      userId: 'stu_rahul',
      title: 'Wellness appointment requested',
      body: 'Hi Rahul, your health score is 42%. We have booked a confidential session with Campus Wellness Counselor (counselor.meera@galgotiasuniversity.edu.in).',
      kind: 'email',
      read: false,
      createdAt: new Date().toISOString(),
      relatedAppointmentId: 'apt_rahul_auto',
    },
    {
      id: 'nt_rahul_mentor',
      userId: 'mentor:counselor.meera@galgotiasuniversity.edu.in',
      title: 'Alert: Rahul Verma needs support',
      body: 'Automated trigger for Rahul Verma (20231004567). Health score: 42%. Please confirm the session.',
      kind: 'alert',
      read: false,
      createdAt: new Date().toISOString(),
      relatedAppointmentId: 'apt_rahul_auto',
    },
    {
      id: 'nt_pranjal_student',
      userId: 'stu_pranjal',
      title: 'Wellness appointment requested',
      body: 'Hi Pranjal, your health score is 42%. We have booked a confidential session with Campus Wellness Counselor (counselor.meera@galgotiasuniversity.edu.in).',
      kind: 'email',
      read: false,
      createdAt: new Date().toISOString(),
      relatedAppointmentId: 'apt_pranjal_auto',
    },
    {
      id: 'nt_pranjal_mentor',
      userId: 'mentor:counselor.meera@galgotiasuniversity.edu.in',
      title: 'Alert: Pranjal Verma needs support',
      body: 'Automated trigger for Pranjal Verma (2500971520144). Health score: 42%. Please confirm the session.',
      kind: 'alert',
      read: false,
      createdAt: new Date().toISOString(),
      relatedAppointmentId: 'apt_pranjal_auto',
    },
  ];
}
