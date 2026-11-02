import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import styles from './Input.module.css';

/** Native text-like input. Pair with <Field> for its label, hint and error. */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={[styles['control'], className].filter(Boolean).join(' ')} />;
}

/**
 * Native <select>. A custom listbox would have to re-implement keyboard handling, typeahead,
 * mobile pickers and screen-reader semantics that the browser already gets right.
 */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={[styles['control'], styles['select'], className].filter(Boolean).join(' ')}
    >
      {children}
    </select>
  );
}
