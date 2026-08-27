import React from 'react';
import { clsx } from 'clsx';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));

  let color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
  let badgeColor = 'bg-emerald-500';
  let label = 'HIGH';

  if (normalized < 40) {
    color = 'text-slate-400 border-slate-600/40 bg-slate-900/30';
    badgeColor = 'bg-slate-500';
    label = 'LOW';
  } else if (normalized < 60) {
    color = 'text-sky-400 border-sky-500/40 bg-sky-950/20';
    badgeColor = 'bg-sky-500';
    label = 'REVIEW';
  } else if (normalized < 80) {
    color = 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    badgeColor = 'bg-amber-500';
    label = 'MEDIUM';
  }

  const dimensionStyles = {
    sm: 'w-10 h-10 text-xs font-bold border-2',
    md: 'w-14 h-14 text-base font-bold border-2',
    lg: 'w-20 h-20 text-2xl font-black border-[3px]',
  };

  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <div
        className={clsx(
          'rounded-full flex items-center justify-center transition-all shadow-inner',
          dimensionStyles[size],
          color
        )}
      >
        <span>{normalized}</span>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Score</span>
          <span className="text-xs font-semibold text-slate-200">{label}</span>
        </div>
      )}
    </div>
  );
};
