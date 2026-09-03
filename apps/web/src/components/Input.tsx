import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Single source of truth for input styling and behavior.
 * When clicking/focusing number inputs with 0, automatically empties the field
 * so typing begins directly with the user's keystroke, without leaving a leading 0.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', type, value, onFocus, onBlur, onClick, onKeyDown, ...props },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);

  const base =
    type === 'color'
      ? 'rounded-lg border border-border bg-surface focus:border-primary focus:outline focus:outline-2 focus:outline-primary disabled:opacity-50'
      : 'rounded-lg border border-border bg-surface px-2.5 py-2 text-ink focus:border-primary focus:outline focus:outline-2 focus:outline-primary disabled:opacity-50';

  // If focused and value is 0 or '0', display empty string so user never types after 0
  const computedValue =
    type === 'number' && isFocused && (value === 0 || value === '0' || value === '0.00')
      ? ''
      : value;

  const clearIfZeroOrSelect = (input: HTMLInputElement) => {
    if (type === 'number') {
      const val = input.value.trim();
      if (val === '0' || val === '0.0' || val === '0.00' || val === '') {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          input.value = '';
        }
      } else {
        input.select();
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    clearIfZeroOrSelect(e.currentTarget);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    clearIfZeroOrSelect(e.currentTarget);
    onClick?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const input = e.currentTarget;
      if ((input.value === '0' || input.value === '0.00') && /^[0-9]$/.test(e.key)) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
    onKeyDown?.(e);
  };

  return (
    <input
      ref={ref}
      type={type}
      value={computedValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
      className={`${base} ${className}`}
    />
  );
});
