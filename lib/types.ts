export type Role = 'student' | 'warden' | 'council';
export type StaffSubRole = 'warden' | 'council';
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type AppointmentStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
export type AppointmentSource = 'auto' | 'manual';

export interface UserMetadata {
  enrollmentId?: string;
  course?: string;
  hostelBlock?: string;
  roomNumber?: string;
  mentorEmail?: string;
  staffId?: string;
  pgName?: string;
  councilRole?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  dateOfBirth: string;
  createdAt: string;
  metadata: UserMetadata;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: Role;
  issuedAt: number;
  expiresAt: number;
}

export interface MessLog {
  id: string;
  studentId: string;
  date: string;
  meal: MealType;
  present: boolean;
  recordedBy: string;
  timestamp: string;
}

export interface CurfewLog {
  id: string;
  studentId: string;
  date: string;
  entryTime: string;
  expectedTime: string;
  isLate: boolean;
  recordedBy: string;
  notes: string;
}

export interface HealthMetrics {
  id: string;
  studentId: string;
  date: string;
  steps: number;
  distanceKm: number;
  calories: number;
  mentalScore: number;
  physicalScore: number;
  weeklyScore: number;
  mood: string;
  lastChatSummary?: string;
  /** 'health_connect' = read from Android Health Connect on-device. Missing/'demo' = seeded or simulated campus demo data. */
  source?: HealthSource;
  /** Average heart rate (bpm) — only ever set from real Health Connect data. */
  heartRateBpm?: number;
  /** Fields that were estimated from steps because the device did not provide them. */
  derivedFields?: Array<'distance' | 'calories'>;
}

export type HealthSource = 'demo' | 'health_connect';

export interface ChatMessage {
  id: string;
  studentId: string;
  role: 'user' | 'bot';
  text: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'crisis';
  scoreImpact?: number;
  createdAt: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  counselorEmail: string;
  counselorName: string;
  reason: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  healthScore: number;
  createdAt: string;
  scheduledFor?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: 'email' | 'system' | 'alert';
  read: boolean;
  createdAt: string;
  relatedAppointmentId?: string;
}

export interface DailyExportSummary {
  date: string;
  totalStudents: number;
  presentCount: number;
  messUtilization: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  lateArrivals: number;
  onTime: number;
  notReturned: number;
}

export interface RegisterPayload {
  role: Role;
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
  enrollmentId?: string;
  course?: string;
  staffId?: string;
  pgName?: string;
  councilRole?: string;
}
