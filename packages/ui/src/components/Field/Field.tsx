import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

/** Props a Field hands to its control so label, hint and error are wired correctly. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  required: boolean | undefined;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode | undefined;
  /** Plain-language problem + fix, e.g. "Enter an amount between $30 and $150". */
  error?: string | undefined;
  required?: boolean | undefined;
  id?: string | undefined;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label + hint + error for one control, via a render prop so any native control can be used.
 *
 * - <label for> provides the accessible name (no aria-label).
 * - Hint and error are linked with aria-describedby; error comes first so it is read first.
 * - aria-invalid only while there is an error. The error is text with an icon-free
 *   "Error:" prefix, so it never relies on red colour.
 */
export function Field({ label, hint, error, required, id, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <div className={styles['field']}>
      <label htmlFor={controlId} className={styles['label']}>
        {label}
        {required ? <span className={styles['required']}> (required)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles['error']}>
          <strong>Error:</strong> {error}
        </p>
      ) : null}
      {children({
        id: controlId,
        'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
        required,
      })}
    </div>
  );
}
