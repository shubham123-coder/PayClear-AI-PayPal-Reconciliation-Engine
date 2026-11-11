// frontend/src/components/ProfitGuard.jsx
import React from 'react';

export default function ProfitGuard({ feeAnalytics, onAskCopilotAdvice }) {
  if (!feeAnalytics) return null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0c1427] to-slate-950 text-white border border-indigo-500/30 shadow-xl shadow-indigo-500/5 relative overflow-hidden transition-all duration-300">
      {/* Ambient background light orb */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>🛡️ Profit Guard Analytics</span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 flex-wrap">
            <span>Net Take-Home Capital:</span>
            <span className="font-mono text-emerald-400 text-xl sm:text-2xl font-black">
              ${feeAnalytics.totalNetDollars}
            </span>
            <span className="text-xs font-normal text-slate-400 font-mono">
              (Effective Deductions: {feeAnalytics.feePercentage}%)
            </span>
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {feeAnalytics.recommendation}
          </p>
        </div>

        <button
          onClick={onAskCopilotAdvice}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-xs font-bold text-white transition-all duration-200 whitespace-nowrap self-start md:self-auto active:scale-95 shadow-sm hover:shadow-indigo-500/20"
        >
          Ask Copilot For Advice →
        </button>
      </div>
    </div>
  );
}
