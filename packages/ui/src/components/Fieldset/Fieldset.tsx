import type { FieldsetHTMLAttributes, ReactNode } from 'react';
import styles from './Fieldset.module.css';

export interface FieldsetProps extends FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend: ReactNode;
  /** Optional supporting text shown under the legend. */
  hint?: ReactNode | undefined;
}

/** Native fieldset + legend: the group name is announced with every control inside it. */
export function Fieldset({ legend, hint, children, className, ...rest }: FieldsetProps) {
  return (
    <fieldset {...rest} className={[styles['fieldset'], className].filter(Boolean).join(' ')}>
      <legend className={styles['legend']}>{legend}</legend>
      {hint ? <p className={styles['hint']}>{hint}</p> : null}
      {children}
    </fieldset>
  );
}
