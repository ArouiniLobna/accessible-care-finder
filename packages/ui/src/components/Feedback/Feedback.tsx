import type { ElementType, ReactNode } from 'react';
import styles from './Feedback.module.css';

/** Content for screen readers only (e.g. disambiguating "Select" → "Select Amelia R."). */
export function VisuallyHidden({
  children,
  as: Tag = 'span',
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className="visually-hidden">{children}</Tag>;
}

/**
 * Placeholder shape while content loads. Purely visual: hidden from assistive technology.
 * Announce loading once, at the region level, instead of once per skeleton.
 */
export function Skeleton({ height = '1rem', width = '100%' }: { height?: string; width?: string }) {
  return <span aria-hidden="true" className={styles['skeleton']} style={{ height, width }} />;
}

/**
 * Spinner + visible text. The spinner is decorative and stops under reduced motion; the
 * text carries the meaning. Live announcement is the parent's job (one region per area).
 */
export function LoadingIndicator({ label }: { label: string }) {
  return (
    <span className={styles['loading']}>
      <span aria-hidden="true" className={styles['spinner']} />
      <span>{label}</span>
    </span>
  );
}

export interface EmptyStateProps {
  title: string;
  headingLevel?: 2 | 3;
  children?: ReactNode;
  actions?: ReactNode;
}

/** A helpful dead end: what happened, why, and what to do next — never just "No data". */
export function EmptyState({ title, headingLevel = 2, children, actions }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles['empty']}>
      <Heading className={styles['emptyTitle']}>{title}</Heading>
      {children ? <div className={styles['emptyBody']}>{children}</div> : null}
      {actions ? <div className={styles['emptyActions']}>{actions}</div> : null}
    </div>
  );
}
