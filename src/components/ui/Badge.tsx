import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'rose' | 'sky' | 'slate' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className,
}) => {
  const variantStyles = {
    gold: 'bg-amber-950/50 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30',
    rose: 'bg-rose-950/50 text-rose-300 border-rose-500/30',
    sky: 'bg-sky-950/50 text-sky-300 border-sky-500/30',
    amber: 'bg-orange-950/50 text-orange-300 border-orange-500/30',
    slate: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
