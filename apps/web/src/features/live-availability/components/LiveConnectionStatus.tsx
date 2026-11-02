import { Badge } from '@acf/ui';
import type { ConnectionState } from '../hooks/useAvailabilityStream';
import styles from './LiveConnectionStatus.module.css';

/**
 * Small visual indicator of the realtime connection. Transitions that matter
 * (paused / resumed) are announced once by the stream hook, so this is not a live region.
 */
export function LiveConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === 'unsupported') return null;
  return (
    <p className={styles.status}>
      {state === 'live' ? (
        <Badge tone="success" withIcon>
          Live availability on
        </Badge>
      ) : state === 'reconnecting' ? (
        <Badge tone="warning" withIcon>
          Reconnecting live updates…
        </Badge>
      ) : (
        <Badge tone="neutral">Connecting live updates…</Badge>
      )}
    </p>
  );
}
