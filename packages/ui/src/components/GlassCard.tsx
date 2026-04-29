import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  intensity = 'medium',
  ...props
}) => {
  const intensityStyles = {
    low: 'bg-white/20 backdrop-blur-sm',
    medium: 'bg-white/40 backdrop-blur-xl',
    high: 'bg-white/60 backdrop-blur-2xl',
  };

  return (
    <div
      className={cn(
        'rounded-3xl border border-white/30 shadow-glass overflow-hidden transition-all duration-300',
        intensityStyles[intensity],
        'luminous-rim',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
