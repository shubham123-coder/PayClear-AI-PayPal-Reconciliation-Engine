// frontend/src/components/KpiCards.jsx
import React from 'react';

export default function KpiCards({ invoices, transactions, matches, feeAnalytics }) {
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmountCents, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.paidAmountCents, 0);
  const pendingCount = invoices.filter(inv => inv.status !== 'PAID').length;
  const unreconciledTxnCount = transactions.filter(t => t.status === 'UNRECONCILED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Invoiced */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-500/30 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Invoiced
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700/60">
            {invoices.length} issued
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-3 tracking-tight">
          ${(totalBilled / 100).toFixed(2)}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Full ledger volume billed</span>
        </div>
      </div>

      {/* 2. Collected Revenue (Emerald) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/30 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Collected Revenue
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono text-[10px] font-semibold">
            Settled
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-3 tracking-tight">
          ${(totalReceived / 100).toFixed(2)}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{pendingCount} invoice{pendingCount === 1 ? '' : 's'} awaiting settlement</span>
        </div>
      </div>

      {/* 3. PayPal Fees Lost (Rose Coral) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-rose-500/30 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Processing Fees
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-mono text-[10px] font-semibold">
            {feeAnalytics?.feePercentage || '0.00'}%
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-3 tracking-tight">
          ${feeAnalytics?.totalFeeDollars || '0.00'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Gateway leakage deducted</span>
        </div>
      </div>

      {/* 4. Unreconciled Payments (Warm Amber) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-500/30 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Unreconciled Feed
          </span>
          {unreconciledTxnCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Action Needed
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono">
              Balanced
            </span>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-3 tracking-tight">
          {unreconciledTxnCount}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{matches.length} pending candidate match{matches.length === 1 ? '' : 'es'}</span>
        </div>
      </div>
    </div>
  );
}
