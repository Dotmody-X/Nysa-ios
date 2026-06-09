import { Platform } from 'react-native';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Calendar from 'expo-calendar';
import type { CalendarEventPayload } from '@/poles/types';

/**
 * Two-way bridge to the phone's native calendar (iCloud on iOS, Google on
 * Android) via expo-calendar. Opt-in: nothing touches the device calendar
 * unless the user connects it from settings. All calls are guarded so the app
 * never crashes if permission is denied or the native module is unavailable
 * (e.g. running before a prebuild).
 */

const KEY = 'cal_sync';

type Persisted = { connected: boolean; calendarId: string | null };

type CalendarSync = Persisted & {
  busy: boolean;
  load: () => Promise<void>;
  connect: () => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => void;
};

function persist(p: Persisted) {
  SecureStore.setItemAsync(KEY, JSON.stringify(p)).catch(() => {});
}

export const useCalendarSync = create<CalendarSync>((set, get) => ({
  connected: false,
  calendarId: null,
  busy: false,
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        set({ connected: !!p.connected, calendarId: p.calendarId ?? null });
      }
    } catch {
      // keep defaults
    }
  },
  connect: async () => {
    set({ busy: true });
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        set({ busy: false });
        return { ok: false, error: 'Permission refusée' };
      }
      const id = await resolveWritableCalendarId();
      if (!id) {
        set({ busy: false });
        return { ok: false, error: 'Aucun calendrier modifiable trouvé' };
      }
      const next = { connected: true, calendarId: id };
      set({ ...next, busy: false });
      persist(next);
      return { ok: true };
    } catch (e) {
      set({ busy: false });
      return { ok: false, error: e instanceof Error ? e.message : 'Erreur' };
    }
  },
  disconnect: () => {
    const next = { connected: false, calendarId: null };
    set(next);
    persist(next);
  },
}));

/** Pick a calendar we can write to — default on iOS, primary/owner on Android. */
async function resolveWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    try {
      const def = await Calendar.getDefaultCalendarAsync();
      if (def?.id) return def.id;
    } catch {
      // fall through to scan
    }
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = cals.filter((c) => c.allowsModifications);
  const primary =
    writable.find((c) => (c as { isPrimary?: boolean }).isPrimary) ??
    writable.find((c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER) ??
    writable[0];
  return primary?.id ?? null;
}

function toDates(p: Pick<CalendarEventPayload, 'start' | 'end' | 'allDay'>) {
  return { startDate: new Date(p.start), endDate: new Date(p.end), allDay: !!p.allDay };
}

/** Create a native event; returns its id (externalId) or null. */
export async function pushDeviceEvent(
  title: string,
  p: CalendarEventPayload,
): Promise<string | null> {
  const { connected, calendarId } = useCalendarSync.getState();
  if (!connected || !calendarId) return null;
  try {
    return await Calendar.createEventAsync(calendarId, {
      title,
      ...toDates(p),
      location: p.location,
      notes: p.notes,
    });
  } catch {
    return null;
  }
}

export async function updateDeviceEvent(
  externalId: string | undefined,
  title: string,
  p: CalendarEventPayload,
): Promise<void> {
  const { connected } = useCalendarSync.getState();
  if (!connected || !externalId) return;
  try {
    await Calendar.updateEventAsync(externalId, {
      title,
      ...toDates(p),
      location: p.location,
      notes: p.notes,
    });
  } catch {
    // ignore — event may have been deleted on the device
  }
}

export async function deleteDeviceEvent(externalId: string | undefined): Promise<void> {
  const { connected } = useCalendarSync.getState();
  if (!connected || !externalId) return;
  try {
    await Calendar.deleteEventAsync(externalId);
  } catch {
    // ignore
  }
}
