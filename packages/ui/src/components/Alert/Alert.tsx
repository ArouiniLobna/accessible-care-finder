import type { ReactNode, Ref } from 'react';
import { StatusIcon, type StatusTone } from '../StatusIcon/StatusIcon';
import styles from './Alert.module.css';

export type AlertTone = StatusTone;
type HeadingLevel = 2 | 3 | 4;

export interface AlertProps {
  tone: AlertTone;
  title: string;
  children?: ReactNode;
  headingLevel?: HeadingLevel;
  /**
   * Live-region behaviour. Default `false`: static content that is simply part of the page.
   * Use `'polite'` for messages that appear after the page has loaded and are not the
   * result of a focus move. Never use live regions for content that is focused on arrival.
   */
  live?: 'polite' | 'assertive' | false;
  /** Ref to the heading, for intentional focus after a failed user action. */
  headingRef?: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
}

const toneLabel: Record<AlertTone, string> = {
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  danger: 'Problem',
};

/**
 * Message block. Tone is never conveyed by colour alone: each tone has a distinct icon
 * shape and a hidden text prefix ("Problem:"), and the visible title says what happened.
 */
export function Alert({
  tone,
  title,
  children,
  headingLevel = 2,
  live = false,
  headingRef,
  actions,
}: AlertProps) {
  const Heading = `h${headingLevel}` as const;
  const liveProps =
    live === 'assertive' ? { role: 'alert' } : live === 'polite' ? { role: 'status' } : {};

  return (
    <div className={`${styles['alert']} ${styles[tone]}`} {...liveProps}>
      <StatusIcon tone={tone} className={styles['icon']} />
      <div className={styles['content']}>
        <Heading
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className={styles['title']}
        >
          <span className="visually-hidden">{`${toneLabel[tone]}:`}</span> {title}
        </Heading>
        {children ? <div className={styles['body']}>{children}</div> : null}
        {actions ? <div className={styles['actions']}>{actions}</div> : null}
      </div>
    </div>
  );
}
