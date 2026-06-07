import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSyncStatus } from './syncStore';

/**
 * Mount once when a user is signed in. Syncs on mount (login) and whenever the
 * app returns to the foreground. Renders nothing.
 */
export function SyncManager() {
  const run = useSyncStatus((s) => s.run);

  useEffect(() => {
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [run]);

  return null;
}
