import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'w-full py-4 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all hover:brightness-110 disabled:opacity-50',
      secondary: 'bg-surface border-border text-white hover:bg-zinc-700 disabled:opacity-50',
      outline: 'border border-electric text-electric hover:bg-electric/10 text-electric disabled:opacity-50',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
