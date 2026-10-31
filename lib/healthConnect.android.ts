/**
 * Android implementation backed by the native Health Connect SDK through
 * `react-native-health-connect`. Requires a development / production build
 * (it does NOT work in Expo Go). All reads are on-device; nothing is simulated.
 */
import { Linking } from 'react-native';
import { toISODate, startOfDay } from './ids';
import { HC_RECORD_TYPES, type HcDay, type HcRecordType, type HcStatus } from './healthConnect.types';

let HC: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  HC = require('react-native-health-connect');
} catch {
  HC = null;
}

const PROVIDER_PACKAGE = 'com.google.android.apps.healthdata';

function status(state: HcStatus['state'], title: string, detail: string, granted: HcRecordType[] = []): HcStatus {
  return { state, title, detail, granted, missing: HC_RECORD_TYPES.filter((t) => !granted.includes(t)) };
}

async function grantedTypes(): Promise<HcRecordType[]> {
  const list: Array<{ accessType?: string; recordType?: string }> = (await HC.getGrantedPermissions()) || [];
  const set = new Set<string>();
  list.forEach((p) => {
    if (p?.accessType === 'read' && p.recordType) set.add(p.recordType);
  });
  return HC_RECORD_TYPES.filter((t) => set.has(t));
}

export async function getHealthConnectStatus(): Promise<HcStatus> {
  if (!HC) {
    return status(
      'native-module-missing',
      'Needs the Android app build',
      'The Health Connect native module is not part of this build (Expo Go cannot load it). Install the development or release build of the Android app to connect.',
    );
  }
  try {
    const codes = HC.SdkAvailabilityStatus || {
      SDK_UNAVAILABLE: 1,
      SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
      SDK_AVAILABLE: 3,
    };
    const sdk = await HC.getSdkStatus();
    if (sdk === codes.SDK_UNAVAILABLE) {
      return status('sdk-unavailable', 'Health Connect unavailable', 'This device does not support Health Connect.');
    }
    if (sdk === codes.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return status(
        'provider-update-required',
        'Update Health Connect',
        'Install or update the Health Connect app from Google Play, then come back and connect.',
      );
    }
    const ok = await HC.initialize();
    if (!ok) return status('error', 'Health Connect failed to start', 'Initialisation returned false. Try again.');
    const granted = await grantedTypes();
    if (!granted.includes('Steps')) {
      return status(
        'permissions-needed',
        granted.length ? 'Steps permission missing' : 'Not connected',
        granted.length
          ? `Steps access is required. Granted: ${granted.join(', ')}. Allow read access to steps to connect.`
          : 'Allow read access to steps, distance, calories and heart rate. Data stays on your device until you sync it to your student profile.',
        granted,
      );
    }
    const missing = HC_RECORD_TYPES.filter((t) => !granted.includes(t));
    if (missing.length) {
      return status(
        'connected',
        'Connected — partial access',
        `Reading real steps. Not granted: ${missing.join(', ')}. Missing values are shown as estimated or blank, never invented. You can grant them below.`,
        granted,
      );
    }
    return status('connected', 'Connected to Health Connect', 'Reading real activity data from this device.', granted);
  } catch (e: any) {
    return status('error', 'Health Connect error', String(e?.message || e));
  }
}

export async function connectHealthConnect(): Promise<HcStatus> {
  const current = await getHealthConnectStatus();
  if (current.state !== 'permissions-needed' && current.state !== 'connected') return current;
  try {
    await HC.requestPermission(
      HC_RECORD_TYPES.map((recordType) => ({ accessType: 'read', recordType })),
    );
  } catch (e: any) {
    return status('error', 'Permission request failed', String(e?.message || e), current.granted);
  }
  return getHealthConnectStatus();
}

function range(day: Date, isToday: boolean) {
  const start = startOfDay(day);
  const end = isToday ? new Date() : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() };
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function readHealthConnectDays(days: number): Promise<HcDay[]> {
  if (!HC) return [];
  const granted = await grantedTypes();
  const has = (t: HcRecordType) => granted.includes(t);
  const out: HcDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const timeRangeFilter = range(d, i === 0);

    const steps = has('Steps')
      ? await safe(async () => {
          const r = await HC.aggregateRecord({ recordType: 'Steps', timeRangeFilter });
          return Number(r?.COUNT_TOTAL ?? 0);
        })
      : null;

    const distanceKm = has('Distance')
      ? await safe(async () => {
          const r = await HC.aggregateRecord({ recordType: 'Distance', timeRangeFilter });
          const m = r?.DISTANCE?.inMeters;
          return typeof m === 'number' ? Number((m / 1000).toFixed(2)) : null;
        })
      : null;

    const activeCalories = has('ActiveCaloriesBurned')
      ? await safe(async () => {
          const r = await HC.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter });
          const k = r?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
          return typeof k === 'number' ? Math.round(k) : null;
        })
      : null;

    const heartRateAvg = has('HeartRate')
      ? await safe(async () => {
          // Prefer the platform aggregate (no pagination / sample-count limits); fall back to raw samples.
          const agg = await safe(async () => HC.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter }));
          const avg = (agg as any)?.BPM_AVG;
          if (typeof avg === 'number' && avg > 0) return Math.round(avg);
          const r = await HC.readRecords('HeartRate', { timeRangeFilter });
          const bpm: number[] = [];
          (r?.records || []).forEach((rec: any) =>
            (rec?.samples || []).forEach((s: any) => {
              if (typeof s?.beatsPerMinute === 'number') bpm.push(s.beatsPerMinute);
            }),
          );
          return bpm.length ? Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length) : null;
        })
      : null;

    out.push({ date: toISODate(d), steps, distanceKm, activeCalories, heartRateAvg });
  }
  return out;
}

export async function openHealthConnectSettings(): Promise<void> {
  try {
    if (HC?.openHealthConnectSettings) {
      HC.openHealthConnectSettings();
      return;
    }
  } catch {
    // fall through to Play Store
  }
  await Linking.openURL(`market://details?id=${PROVIDER_PACKAGE}`).catch(() => undefined);
}
