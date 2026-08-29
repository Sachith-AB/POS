import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Single source of truth for input styling — every text/number/password/color
 * input in the app renders through this so focus, border, and background
 * colors always come from the shop's theme tokens, never a hardcoded value
 * or the browser's default (theme-blind) focus outline.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', type, ...props },
  ref
) {
  const base =
    type === 'color'
      ? 'rounded-lg border border-border bg-surface focus:border-primary focus:outline focus:outline-2 focus:outline-primary disabled:opacity-50'
      : 'rounded-lg border border-border bg-surface px-2.5 py-2 text-ink focus:border-primary focus:outline focus:outline-2 focus:outline-primary disabled:opacity-50';

  return <input ref={ref} type={type} {...props} className={`${base} ${className}`} />;
});
