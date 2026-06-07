import { createEntry, patchPayload, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type BucketPayload, type MediaPayload } from '@/poles/types';

/** Loisirs helpers — media tracker, wishlist, bucket list. */

export async function addMedia(args: { title: string; kind: MediaPayload['kind'] }) {
  return createEntry({
    poleId: POLE.leisure,
    type: 'media',
    title: args.title,
    payload: { kind: args.kind, done: false },
  });
}

export async function toggleMedia(item: Entry) {
  await patchPayload<'media'>(item, { done: !(item.payload as MediaPayload).done });
}

export async function removeMedia(item: Entry) {
  await softDeleteEntry(item);
}

export async function addWishlist(args: { title: string; price?: number }) {
  return createEntry({ poleId: POLE.leisure, type: 'wishlist_item', title: args.title, payload: { price: args.price } });
}

export async function removeWishlist(item: Entry) {
  await softDeleteEntry(item);
}

export async function addBucket(title: string) {
  return createEntry({ poleId: POLE.leisure, type: 'bucket_item', title, payload: { done: false } });
}

export async function toggleBucket(item: Entry) {
  await patchPayload<'bucket_item'>(item, { done: !(item.payload as BucketPayload).done });
}

export async function removeBucket(item: Entry) {
  await softDeleteEntry(item);
}
