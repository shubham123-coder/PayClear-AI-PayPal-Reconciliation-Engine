// frontend/src/components/HowItWorks.jsx
// Step-by-step usage guide so judges (and new users) immediately understand the workflow.
import React from 'react';

const STEPS = [
  {
    n: '1',
    title: 'Fill your ledger',
    body: 'Click "1-Click Scenarios" to simulate 3 realistic payments hitting your PayPal account (exact reference, 50% milestone, and holding company mismatch) — or create custom invoices.',
    tip: 'Your own manual invoices are never deleted.'
  },
  {
    n: '2',
    title: 'Run AI Reconciliation',
    body: 'One click scans every pending invoice against the PayPal bank feed using 4 deterministic matching rules, then asks our AI to explain every fee discrepancy in plain English.',
    tip: 'Confidence score highlights match certainty.'
  },
  {
    n: '3',
    title: 'Approve or reject matches',
    body: 'Review the Match Queue. Confirm a match to atomically update the ledger — invoices become PAID/PARTIAL and transactions become RECONCILED with zero math errors.',
    tip: 'Click any invoice row to view full audit breakdown.'
  },
  {
    n: '4',
    title: 'Protect your profit',
    body: 'Profit Guard tracks fee leakage, the AI Copilot answers questions about your ledger in real time, and you can export an accountant-ready CSV audit trail in one click.',
    tip: 'Turn PayPal payment chaos into tax-ready books.'
  }
];

export default function HowItWorks({ onDismiss }) {
  return (
    <div className="bg-gradient-to-r from-indigo-900/90 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-indigo-500/5 relative animate-fadeIn overflow-hidden">
      {/* Specular line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
        title="Dismiss guide"
      >
        ✕
      </button>

      <div className="mb-4">
        <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
          <span>🚀 How PayClear Works — The 4-Step FinTech Flow</span>
        </h3>
        <p className="text-xs text-indigo-200/80 mt-0.5">
          From unorganized PayPal gateway transactions to a reconciled, audit-ready balance sheet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-white/5 backdrop-blur-sm rounded-xl p-3.5 border border-white/10 hover:border-indigo-400/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-sm">
                {s.n}
              </span>
              <span className="font-bold text-xs text-white tracking-tight">{s.title}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{s.body}</p>
            <div className="text-[10px] mt-2 text-indigo-300/80 font-mono flex items-center gap-1">
              <span>💡</span>
              <span className="truncate">{s.tip}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
