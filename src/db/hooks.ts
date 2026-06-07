import { useEffect, useState } from 'react';
import type { Model, Query } from '@nozbe/watermelondb';

/**
 * Subscribe a component to a WatermelonDB query. The component re-renders
 * automatically whenever matching records (or the observed columns) change —
 * this is the reactive, offline-first read path.
 *
 * Pass `observeColumns` to also react to field updates *within* visible rows
 * (e.g. toggling a task's `done`), not just membership of the result set.
 *
 * `deps` controls when the query is rebuilt; keep it stable to avoid resubscribe
 * loops (e.g. `[projectId]`).
 */
export function useObservedQuery<T extends Model>(
  build: () => Query<T>,
  deps: React.DependencyList,
  observeColumns?: string[],
): T[] {
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    const query = build();
    const observable = observeColumns
      ? query.observeWithColumns(observeColumns)
      : query.observe();
    const sub = observable.subscribe(setRows);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rows;
}
