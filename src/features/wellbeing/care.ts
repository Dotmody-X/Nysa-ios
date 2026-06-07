import { createEntry, softDeleteEntry } from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import type { Entry } from '@/db/models/Entry';
import { POLE, RELATION } from '@/poles/types';

/** Practitioners (doctors / psy) + appointments. Appointments mirror into Planning. */

export async function addPractitioner(args: { name: string; specialty?: string; phone?: string }) {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'practitioner',
    title: args.name,
    payload: { specialty: args.specialty, phone: args.phone },
  });
}

export async function removePractitioner(item: Entry) {
  await softDeleteEntry(item);
}

/**
 * Create an appointment AND its mirror event in Planning (same interconnection
 * pattern as workouts / focus sessions), linked in the graph.
 */
export async function addAppointment(args: {
  practitionerId?: string;
  practitionerName?: string;
  start: number;
  durationMin?: number;
  location?: string;
}) {
  const durationMin = args.durationMin ?? 30;
  const title = args.practitionerName ? `RDV · ${args.practitionerName}` : 'Rendez-vous';

  const appt = await createEntry({
    poleId: POLE.wellbeing,
    type: 'appointment',
    title,
    payload: {
      practitionerId: args.practitionerId,
      practitionerName: args.practitionerName,
      start: args.start,
      durationMin,
      location: args.location,
    },
    occurredAt: new Date(args.start),
  });

  const event = await createEntry({
    poleId: POLE.planning,
    type: 'calendar_event',
    title,
    payload: { start: args.start, end: args.start + durationMin * 60_000 },
    occurredAt: new Date(args.start),
  });

  await createLink(appt.id, event.id, RELATION.scheduledIn);
  return appt;
}

export async function cancelAppointment(item: Entry) {
  await softDeleteEntry(item);
}
