// frontend/src/components/ActionBar.jsx
import React from 'react';
import RingSpinner from './RingSpinner';

export default function ActionBar({
  loading,
  onLoadScenarios,
  onRunReconciliation,
  onDownloadAuditTrail,
  onOpenNewInvoiceModal
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm transition-colors duration-200">
      <div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Operations & Reconciliation</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Trigger matching algorithms, load realistic multi-tier scenarios, or export your audit trail.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* 1-Click Scenarios */}
        <button
          onClick={onLoadScenarios}
          disabled={loading}
          className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 active:scale-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
          title="Seed realistic client transactions into your sandbox"
        >
          <span>🧪</span>
          <span>1-Click Scenarios</span>
        </button>

        {/* Primary Action: Run AI Reconciliation */}
        <button
          onClick={onRunReconciliation}
          disabled={loading}
          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <RingSpinner size={14} className="text-white" />
          ) : (
            <span>⚡</span>
          )}
          <span>Run AI Reconciliation</span>
        </button>

        {/* Audit Trail CSV */}
        <button
          onClick={onDownloadAuditTrail}
          className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 active:scale-95 transition-all duration-200 flex items-center gap-2"
          title="Download confirmed matches in CSV format"
        >
          <span>📥</span>
          <span className="hidden md:inline">Audit Trail</span>
          <span className="md:hidden">CSV</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">CSV</span>
        </button>

        {/* + New Invoice */}
        <button
          onClick={onOpenNewInvoiceModal}
          className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
        >
          <span>+</span>
          <span>New Invoice</span>
        </button>
      </div>
    </div>
  );
}
