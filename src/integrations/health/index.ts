import { Platform } from 'react-native';

/**
 * Health integration behind a single interface (CADRAGE §6).
 *
 * The rest of the app never imports a vendor SDK directly — it calls these
 * functions, and the platform detail (HealthKit on iOS, Health Connect on
 * Android) stays hidden here. Swapping providers later touches only this file.
 *
 * NOTE: these call native modules, so they only work in a development build
 * AFTER `npx expo run:ios` / `run:android`. On the iOS *simulator* HealthKit
 * usually has no sleep data unless you add some in the Health app — test on a
 * real device for real numbers. Every call degrades gracefully if the native
 * module isn't present yet.
 */

export type HealthStatus = 'unavailable' | 'denied' | 'ready';

const SLEEP_ID = 'HKCategoryTypeIdentifierSleepAnalysis';

export async function isHealthAvailable(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const HK = require('@kingstinct/react-native-healthkit');
      return await (HK.isHealthDataAvailable?.() ?? HK.default?.isHealthDataAvailable?.());
    }
    if (Platform.OS === 'android') {
      const HC = require('react-native-health-connect');
      const status = await HC.getSdkStatus();
      return status === HC.SdkAvailabilityStatus.SDK_AVAILABLE;
    }
  } catch (e) {
    console.warn('[health] availability check failed (rebuild needed?)', e);
  }
  return false;
}

/** Ask the user for read access to sleep. Returns true if granted. */
export async function requestSleepPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const HK = require('@kingstinct/react-native-healthkit');
      const requestAuthorization = HK.requestAuthorization ?? HK.default?.requestAuthorization;
      // v13 API: object with toRead/toShare. Reads can't report grant status
      // (HealthKit privacy), so we just request and let the read tell us.
      await requestAuthorization({ toRead: [SLEEP_ID] });
      return true;
    }
    if (Platform.OS === 'android') {
      const HC = require('react-native-health-connect');
      await HC.initialize();
      const granted = await HC.requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]);
      return Array.isArray(granted) && granted.length > 0;
    }
  } catch (e) {
    console.warn('[health] permission request failed', e);
  }
  return false;
}

/** Total minutes asleep during last night (≈ previous 18h window). */
export async function readLastNightSleepMinutes(): Promise<number | null> {
  const now = new Date();
  const from = new Date(now.getTime() - 18 * 60 * 60 * 1000);
  try {
    if (Platform.OS === 'ios') {
      const HK = require('@kingstinct/react-native-healthkit');
      const queryCategorySamples = HK.queryCategorySamples ?? HK.default?.queryCategorySamples;
      if (typeof queryCategorySamples !== 'function') return null;
      const res = await queryCategorySamples(SLEEP_ID, { limit: 100 });
      // v6+ may return { samples } or a plain array.
      const samples: Array<{ value: number; startDate: string; endDate: string }> = Array.isArray(res)
        ? res
        : (res?.samples ?? []);
      const minutes = samples
        .filter((s) => s.value > 0 && new Date(s.startDate).getTime() >= from.getTime())
        .reduce((sum, s) => sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000, 0);
      return Math.round(minutes) || null;
    }
    if (Platform.OS === 'android') {
      const HC = require('react-native-health-connect');
      await HC.initialize();
      const res = await HC.readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: now.toISOString() },
      });
      const records = res?.records ?? [];
      const minutes = records.reduce(
        (sum: number, r: { startTime: string; endTime: string }) =>
          sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000,
        0,
      );
      return Math.round(minutes) || null;
    }
  } catch (e) {
    console.warn('[health] read sleep failed', e);
  }
  return null;
}
