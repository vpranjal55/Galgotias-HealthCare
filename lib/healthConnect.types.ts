/**
 * Android Health Connect bridge — shared types.
 * Real data only comes from the Android implementation (healthConnect.android.ts).
 * Web and iOS use the stub in healthConnect.ts, which reports an honest "not available" status.
 */

export type HcRecordType = 'Steps' | 'Distance' | 'ActiveCaloriesBurned' | 'HeartRate';

export type HcState =
  | 'web-unsupported'
  | 'ios-unsupported'
  | 'native-module-missing'
  | 'sdk-unavailable'
  | 'provider-update-required'
  | 'permissions-needed'
  | 'connected'
  | 'error';

export interface HcStatus {
  state: HcState;
  title: string;
  detail: string;
  /** Record types the user has granted read access to. */
  granted: HcRecordType[];
  /** Record types not yet granted (set by the Android implementation; empty/absent = nothing missing). */
  missing?: HcRecordType[];
}

export interface HcDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  steps: number | null;
  distanceKm: number | null;
  activeCalories: number | null;
  heartRateAvg: number | null;
}

export const HC_RECORD_TYPES: HcRecordType[] = ['Steps', 'Distance', 'ActiveCaloriesBurned', 'HeartRate'];
