import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
        <input
          ref={ref}
          className={`w-full bg-dark border ${error ? 'border-red-500' : 'border-white/10'} rounded-2xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-electric transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
