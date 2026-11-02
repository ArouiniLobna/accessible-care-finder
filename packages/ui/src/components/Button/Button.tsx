import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  fullWidth?: boolean | undefined;
}

/**
 * Class names for button styling. Use it on a router `<Link>` when an action *navigates*:
 * links go places, buttons do things — the element must match the behaviour, even when
 * the visual design is the same.
 */
export function buttonClassName({
  variant = 'primary',
  fullWidth = false,
}: ButtonStyleOptions = {}) {
  return [styles['button'], styles[variant], fullWidth ? styles['fullWidth'] : undefined]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  /** Shows progress text and keeps the button focusable (aria-disabled rather than disabled). */
  busy?: boolean | undefined;
  busyLabel?: string | undefined;
}

/**
 * Native <button>. Defaults to type="button" so it never submits a form by accident.
 * While `busy`, it stays in the tab order (a disabled button would drop focus to <body>)
 * and ignores clicks.
 */
export function Button({
  variant,
  fullWidth,
  busy = false,
  busyLabel,
  className,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={[buttonClassName({ variant, fullWidth }), className].filter(Boolean).join(' ')}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
