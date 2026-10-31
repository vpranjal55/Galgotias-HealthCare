/**
 * Web / iOS stub. Health Connect is an Android-only API, so these platforms never
 * produce health data from a device. The status below is shown to the user as-is;
 * nothing here ever fabricates readings.
 */
import { Platform } from 'react-native';
import type { HcDay, HcStatus } from './healthConnect.types';

export async function getHealthConnectStatus(): Promise<HcStatus> {
  if (Platform.OS === 'web') {
    return {
      state: 'web-unsupported',
      title: 'Not connected — web preview',
      detail:
        'Health Connect only works in the Android app. This web build cannot read device health data, so the figures shown here are campus demo data.',
      granted: [],
    };
  }
  return {
    state: 'ios-unsupported',
    title: 'Not available on iOS',
    detail: 'Health Connect is an Android feature. Figures shown are campus demo data.',
    granted: [],
  };
}

export async function connectHealthConnect(): Promise<HcStatus> {
  return getHealthConnectStatus();
}

export async function readHealthConnectDays(_days: number): Promise<HcDay[]> {
  return [];
}

export async function openHealthConnectSettings(): Promise<void> {
  // nothing to open outside Android
}
