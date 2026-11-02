import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Choice.module.css';

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label: ReactNode;
  /** Optional supporting text, linked with aria-describedby. */
  description?: ReactNode | undefined;
}

/**
 * Native checkbox/radio with a large label hit area (≥ 44px tall) and a 24px indicator.
 * The <input> stays in the DOM and in the accessibility tree; only its appearance changes,
 * so keyboard, screen reader and forced-colours behaviour are the browser's own.
 */
function Choice({
  type,
  label,
  description,
  id,
  className,
  ...rest
}: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={[styles['choice'], className].filter(Boolean).join(' ')}>
      <input
        {...rest}
        id={inputId}
        type={type}
        className={`${styles['input']} ${type === 'radio' ? styles['radio'] : styles['checkbox']}`}
        aria-describedby={
          [rest['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined
        }
      />
      <div className={styles['text']}>
        {/* Only the label text names the control; the description is linked separately. */}
        <label htmlFor={inputId} className={styles['label']}>
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className={styles['description']}>
            {description}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type CheckboxProps = ChoiceProps;
export function Checkbox(props: CheckboxProps) {
  return <Choice {...props} type="checkbox" />;
}

export type RadioProps = ChoiceProps;
export function Radio(props: RadioProps) {
  return <Choice {...props} type="radio" />;
}
