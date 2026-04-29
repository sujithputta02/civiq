import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RefractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const RefractiveButton: React.FC<RefractiveButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none overflow-hidden';

  const variants = {
    primary:
      'bg-accent-primary text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5',
    secondary: 'glass-morphism text-slate-900 hover:bg-white/50',
    ghost: 'text-slate-600 hover:bg-slate-100/50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
      )}
    </button>
  );
};
