import { type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'rounded-lg border px-3.5 py-2 font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer select-none';

  const variants = {
    primary: 'border-primary bg-primary text-on-primary hover:bg-primary-hover shadow-sm',
    secondary: 'border-border bg-surface text-ink hover:bg-canvas shadow-xs',
    danger: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    ghost: 'border-transparent bg-transparent text-ink hover:bg-canvas',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1">
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
