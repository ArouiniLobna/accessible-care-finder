import type { ReactNode } from 'react';
import { StatusIcon, type StatusTone } from '../StatusIcon/StatusIcon';
import styles from './Badge.module.css';

export type BadgeTone = StatusTone | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  /** Show the tone's shape icon. Text remains the primary carrier of meaning. */
  withIcon?: boolean;
  children: ReactNode;
}

/** Short status label. Plain text in the accessibility tree — not a control, not a live region. */
export function Badge({ tone = 'neutral', withIcon = false, children }: BadgeProps) {
  return (
    <span className={`${styles['badge']} ${styles[tone]}`}>
      {withIcon ? <StatusIcon tone={tone} className={styles['icon']} /> : null}
      <span>{children}</span>
    </span>
  );
}
