/**
 * Automated Emergency / Support Trigger
 *
 * Event-driven evaluator: if a student's daily or weekly health score
 * drops to 50% or below, generate a counselor appointment and fan out
 * email-style alerts to the student and their assigned mentor.
 *
 * This is the mobile equivalent of a backend cron / webhook handler.
 */

import type { Appointment, HealthMetrics, NotificationItem, User } from './types';
import { todayISO, uid } from './ids';

export const HEALTH_ALERT_THRESHOLD = 50;

export interface TriggerResult {
  triggered: boolean;
  appointment?: Appointment;
  notifications: NotificationItem[];
  reason: string;
}

/** Minimum days with real activity data before physical scores may raise an alert. */
export const MIN_ACTIVITY_DAYS_FOR_ALERT = 3;

export interface TriggerContext {
  /** Past (complete) days that carry real activity data. Today is excluded — it is still in progress. */
  completeActivityDays: number;
}

export function evaluateHealthTrigger(
  student: User,
  metrics: HealthMetrics,
  existing: Appointment[],
  ctx: TriggerContext = { completeActivityDays: MIN_ACTIVITY_DAYS_FOR_ALERT },
): TriggerResult {
  // Sparse / incomplete / demo-simulated activity must never raise a health alert on its own.
  // With too little activity history only the mental (chat) score can trigger support.
  const activityTrusted = ctx.completeActivityDays >= MIN_ACTIVITY_DAYS_FOR_ALERT;
  const score = activityTrusted
    ? Math.min(metrics.weeklyScore ?? 100, metrics.mentalScore ?? 100)
    : metrics.mentalScore ?? 100;
  if (score > HEALTH_ALERT_THRESHOLD) {
    return {
      triggered: false,
      notifications: [],
      reason: `Score ${score}% is above the ${HEALTH_ALERT_THRESHOLD}% threshold.`,
    };
  }

  const alreadyOpen = existing.some(
    (a) =>
      a.studentId === student.id &&
      a.source === 'auto' &&
      (a.status === 'pending' || a.status === 'scheduled') &&
      Date.now() - new Date(a.createdAt).getTime() < 36 * 60 * 60 * 1000,
  );

  if (alreadyOpen) {
    return {
      triggered: false,
      notifications: [],
      reason: 'An automated appointment is already open for this student.',
    };
  }

  const counselorEmail = student.metadata.mentorEmail || 'counselor@galgotiasuniversity.edu.in';
  const counselorName = 'Campus Wellness Counselor';
  const reason =
    score <= 20
      ? `Crisis-level wellness score (${score}%). Immediate counselor outreach required.`
      : `Weekly/daily health score dropped to ${score}% (threshold ${HEALTH_ALERT_THRESHOLD}%). Auto-scheduled support session.`;

  const appointment: Appointment = {
    id: uid('apt'),
    studentId: student.id,
    counselorEmail,
    counselorName,
    reason,
    status: 'pending',
    source: 'auto',
    healthScore: score,
    createdAt: new Date().toISOString(),
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const studentMail: NotificationItem = {
    id: uid('ntf'),
    userId: student.id,
    title: 'Wellness appointment requested',
    body: `Hi ${student.name.split(' ')[0]}, your health score is ${score}%. We've booked a confidential session with ${counselorName} (${counselorEmail}). Please attend — your campus family is with you.`,
    kind: 'email',
    read: false,
    createdAt: new Date().toISOString(),
    relatedAppointmentId: appointment.id,
  };

  const mentorMail: NotificationItem = {
    id: uid('ntf'),
    userId: `mentor:${counselorEmail}`,
    title: `Alert: ${student.name} needs support`,
    body: `Automated trigger for ${student.name} (${student.metadata.enrollmentId || student.email}). Health score: ${score}%. Reason: ${reason}. Please confirm the session.`,
    kind: 'alert',
    read: false,
    createdAt: new Date().toISOString(),
    relatedAppointmentId: appointment.id,
  };

  return {
    triggered: true,
    appointment,
    notifications: [studentMail, mentorMail],
    reason,
  };
}

export function physicalScoreFromActivity(steps: number, calories: number): number {
  const stepScore = Math.min(100, Math.round((steps / 8000) * 100));
  const calScore = Math.min(100, Math.round((calories / 350) * 100));
  return Math.round(stepScore * 0.7 + calScore * 0.3);
}

/**
 * Weekly score = 50% physical + 50% mental.
 *  - Physical uses ONLY verified Health Connect days (past days with steps > 0). Demo / simulated /
 *    zero-step rows and today's still-in-progress day never feed it.
 *  - Mental is scored independently from every day's mental score.
 *  - With no verified physical days the weekly score is the mental average alone.
 */
export function weeklyScoreFromDays(days: HealthMetrics[]): number {
  if (!days.length) return 62;
  const last7 = days.slice(0, 7);
  const mentalAvg = last7.reduce((sum, d) => sum + d.mentalScore, 0) / last7.length;
  const today = todayISO();
  const verified = last7.filter((d) => d.source === 'health_connect' && d.steps > 0 && d.date !== today);
  if (!verified.length) return Math.round(mentalAvg);
  const physicalAvg = verified.reduce((sum, d) => sum + d.physicalScore, 0) / verified.length;
  return Math.round(physicalAvg * 0.5 + mentalAvg * 0.5);
}

export function distanceFromSteps(steps: number): number {
  return Number(((steps * 0.00078)).toFixed(2));
}

export function caloriesFromSteps(steps: number): number {
  return Math.round(steps * 0.04);
}

/** Daily targets used for activity rings (same references as physicalScoreFromActivity). */
export const DAILY_GOALS = { steps: 8000, calories: 350, distanceKm: 6 } as const;
