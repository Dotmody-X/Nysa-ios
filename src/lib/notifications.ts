import * as Notifications from 'expo-notifications';

/**
 * Local notifications (scheduled reminders). No push server — everything is
 * scheduled on-device, so it works offline once set.
 */

// Show banners even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    console.warn('[notif] permission', e);
    return false;
  }
}

/** Map a reminder sound choice to an expo-notifications content.sound value. */
function soundValue(sound?: string): boolean | string {
  if (sound === 'none') return false;
  if (!sound || sound === 'default') return 'default';
  return sound; // bundled filename, e.g. 'doux.wav'
}

/** One-off notification at a specific date. Returns the id (to cancel later). */
export async function scheduleOnceAt(title: string, body: string, date: Date, sound?: string): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null; // in the past → skip
  if (!(await ensureNotificationPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: soundValue(sound) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch (e) {
    console.warn('[notif] scheduleOnce', e);
    return null;
  }
}

/** Repeating daily notification at hour:minute. */
export async function scheduleDaily(title: string, body: string, hour: number, minute: number, sound?: string): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: soundValue(sound) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  } catch (e) {
    console.warn('[notif] scheduleDaily', e);
    return null;
  }
}

export async function cancelNotification(id?: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('[notif] cancel', e);
  }
}
