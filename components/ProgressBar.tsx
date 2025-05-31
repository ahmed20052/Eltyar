import React from 'react';
import { ARABIC_STRINGS } from '../constants';

interface ProgressBarProps {
  progressPercent: number; // 0-100
  completedSteps: number;
  totalSteps: number;
  height?: string; // e.g., 'h-2', 'h-3'
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progressPercent,
  completedSteps,
  totalSteps,
  height = 'h-2.5',
}) => {
  const displayPercent = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1 text-xs text-slate-600 dark:text-slate-400">
        <span>{ARABIC_STRINGS.PROGRESS}</span>
        {/* Ensure totalSteps is not 0 to avoid division by zero in display text, though progressPercent handles it for bar */}
        <span>{ARABIC_STRINGS.REVIEWS_COMPLETED_OF_TOTAL(completedSteps, totalSteps > 0 ? totalSteps : 0)}</span>
      </div>
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full ${height}`}>
        <div
          className="bg-sky-500 dark:bg-sky-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${displayPercent}%`, height: '100%' }}
          role="progressbar"
          aria-valuenow={displayPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${ARABIC_STRINGS.PROGRESS}: ${displayPercent.toFixed(0)}%`}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;