// frontend/src/components/ReconciliationProgress.jsx
// Live progress card for the AI reconciliation run (fed by backend SSE events).
import React from 'react';
import RingSpinner from './RingSpinner';

const TITLES = {
  start: 'Initializing Reconciliation Engine…',
  scanning: 'Scanning Pending Invoices vs Bank Feed…',
  matching: 'AI Synthesizing Discrepancies & Matches…',
  done: 'Reconciliation Run Finished',
  error: 'Reconciliation Failed'
};

export default function ReconciliationProgress({ progress }) {
  if (!progress) return null;

  const { percent = 0, stage = 'start', label = '', current, total } = progress;
  const isError = stage === 'error';
  const isDone = stage === 'done';

  const barColor = isError
    ? 'from-rose-500 to-red-600'
    : isDone
    ? 'from-emerald-500 to-emerald-600'
    : 'from-indigo-600 via-indigo-500 to-violet-600';

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300 animate-slideUp">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isDone ? (
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
              ✓
            </span>
          ) : isError ? (
            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
              ✕
            </span>
          ) : (
            <RingSpinner size={16} className="text-indigo-500" />
          )}
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate tracking-tight">
            {TITLES[stage] || 'AI Reconciliation'}
          </span>
        </div>
        <span
          className={`font-mono text-xs font-extrabold shrink-0 px-2.5 py-0.5 rounded-full ${
            isError
              ? 'bg-rose-50 dark:bg-rose-950 text-rose-600'
              : isDone
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
              : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {isError ? 'ERR' : `${Math.round(percent)}%`}
        </span>
      </div>

      {/* Progress track */}
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="leading-relaxed truncate">{label}</span>
        {Number.isFinite(current) && Number.isFinite(total) && total > 0 && (
          <span className="font-mono shrink-0 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px]">
            {current} / {total}
          </span>
        )}
      </div>
    </div>
  );
}
