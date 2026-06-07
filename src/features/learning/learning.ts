import { createEntry, patchPayload, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type BookPayload, type CoursePayload } from '@/poles/types';

/** Apprentissage helpers — books, courses, second-brain notes. */

const BOOK_CYCLE: BookPayload['status'][] = ['to-read', 'reading', 'read'];

export async function addBook(args: { title: string; author?: string }) {
  return createEntry({
    poleId: POLE.learning,
    type: 'book',
    title: args.title,
    payload: { status: 'to-read', author: args.author },
  });
}

export async function cycleBookStatus(item: Entry) {
  const cur = (item.payload as BookPayload).status;
  const next = BOOK_CYCLE[(BOOK_CYCLE.indexOf(cur) + 1) % BOOK_CYCLE.length];
  await patchPayload<'book'>(item, { status: next });
}

export async function removeBook(item: Entry) {
  await softDeleteEntry(item);
}

export async function addCourse(title: string) {
  return createEntry({ poleId: POLE.learning, type: 'course', title, payload: { progress: 0 } });
}

export async function setCourseProgress(item: Entry, progress: number) {
  await patchPayload<'course'>(item, { progress: Math.max(0, Math.min(100, progress)) });
}

export async function removeCourse(item: Entry) {
  await softDeleteEntry(item);
}

export async function addNote(args: { title: string; content?: string }) {
  return createEntry({ poleId: POLE.learning, type: 'note', title: args.title, payload: { content: args.content } });
}

export async function removeNote(item: Entry) {
  await softDeleteEntry(item);
}

export const bumpCourse = (item: Entry, delta: number) =>
  setCourseProgress(item, ((item.payload as CoursePayload).progress || 0) + delta);
