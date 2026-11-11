// frontend/src/components/MatchQueue.jsx
import React from 'react';

export default function MatchQueue({ matches, onConfirmMatch, onRejectMatch }) {
  return (
    <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>AI Suggested Match Queue</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 font-mono font-bold">
              {matches.length} pending
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deterministic rule engine matches paired with plain-English AI fee discrepancy explanations.
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-2xl mx-auto mb-2 text-indigo-500">
            ✨
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
            All cleared — No pending matches to review
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Click <strong className="text-slate-800 dark:text-slate-200 font-semibold">"1-Click Scenarios"</strong> to populate test ledger data, then click <strong className="text-slate-800 dark:text-slate-200 font-semibold">"Run AI Reconciliation"</strong>.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {matches.map((m) => {
            const invDue = ((m.invoice.totalAmountCents - m.invoice.paidAmountCents) / 100).toFixed(2);
            const txGross = (m.transaction.grossAmountCents / 100).toFixed(2);
            const txFee = (m.transaction.feeAmountCents / 100).toFixed(2);
            const txNet = (m.transaction.netAmountCents / 100).toFixed(2);

            return (
              <div
                key={m.id}
                className="p-5 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3.5 flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {m.matchType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded">
                      {(m.confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  {/* Dual-Panel Comparison: Target Invoice vs PayPal Deposit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-850/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {/* Left: Invoice */}
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        Target Invoice
                      </span>
                      <div className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                        #{m.invoice.invoiceNumber}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                        {m.invoice.customerName}
                      </div>
                      <div className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm pt-0.5">
                        ${invDue} <span className="text-[11px] font-normal text-slate-400">balance</span>
                      </div>
                    </div>

                    {/* Right: PayPal Deposit */}
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                        PayPal Bank Feed
                      </span>
                      <div className="font-extrabold text-slate-900 dark:text-white font-mono text-sm truncate">
                        {m.transaction.payerName || 'PayPal Payer'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        Gross: ${txGross} • Fee: <span className="text-rose-500 font-bold">${txFee}</span>
                      </div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm pt-0.5">
                        Net Deposited: ${txNet}
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation Callout Box */}
                  <div className="text-xs text-slate-800 dark:text-slate-200 bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 p-3.5 rounded-xl flex items-start gap-2.5 leading-relaxed">
                    <span className="text-sm shrink-0">🤖</span>
                    <div>
                      <strong className="text-amber-900 dark:text-amber-300 font-bold">AI Explanation: </strong>
                      <span>{m.aiExplanation}</span>
                    </div>
                  </div>
                </div>

                {/* Approve / Reject Actions */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onConfirmMatch(m.id)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all duration-200"
                  >
                    ✓ Confirm Match
                  </button>
                  <button
                    onClick={() => onRejectMatch(m.id)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
