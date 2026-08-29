import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Input } from './Input';

interface PinInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Reusable N-box PIN entry — one boxed digit per cell, auto-advancing focus. */
export function PinInput({ length, value, onChange, onComplete, disabled, autoFocus }: PinInputProps) {
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) boxRefs.current[0]?.focus();
    // Only on mount — this isn't meant to steal focus on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the value is reset to empty from outside (e.g. after a failed
  // attempt), put focus back at the start automatically.
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== '' && value === '') {
      boxRefs.current[0]?.focus();
    }
    prevValueRef.current = value;
  }, [value]);

  // Whenever the field becomes enabled (e.g. a prerequisite field just got
  // filled in), jump straight into it instead of requiring a manual click.
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      boxRefs.current[0]?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  function handleChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[index] = char;
    const joined = next.join('');
    onChange(joined);
    if (char) {
      if (index < length - 1) {
        boxRefs.current[index + 1]?.focus();
      } else if (joined.length === length) {
        onComplete?.(joined);
      }
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[index - 1] = '';
      onChange(next.join(''));
      boxRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, i) => (
        <Input
          key={i}
          ref={(el) => {
            boxRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoComplete="off"
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-10 text-center text-xl"
        />
      ))}
    </div>
  );
}
