import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import { Link } from '../models/Link';

const links = () => database.get<Link>('links');

/** All links originating from an entry. */
export function queryLinksFrom(fromId: string) {
  return links().query(Q.where('from_id', fromId), Q.where('deleted_at', null));
}

/** All links pointing at an entry. */
export function queryLinksTo(toId: string) {
  return links().query(Q.where('to_id', toId), Q.where('deleted_at', null));
}

/**
 * Create a relationship between two entries. The optional `prepared` flag lets
 * callers batch this inside an existing `database.write` (used by finishSession
 * so the whole interconnection is one atomic transaction).
 */
export function prepareLink(fromId: string, toId: string, relation: string) {
  return links().prepareCreate((l) => {
    l.fromId = fromId;
    l.toId = toId;
    l.relation = relation;
    l.deletedAt = null;
  });
}

export async function createLink(fromId: string, toId: string, relation: string): Promise<Link> {
  return database.write(async () => links().create((l) => {
    l.fromId = fromId;
    l.toId = toId;
    l.relation = relation;
    l.deletedAt = null;
  }));
}
