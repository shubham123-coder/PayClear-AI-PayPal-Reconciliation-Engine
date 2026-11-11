// frontend/src/components/LedgerTables.jsx
import React from 'react';
import RingSpinner from './RingSpinner';

export default function LedgerTables({
  invoices,
  transactions,
  onGenerateReminder,
  onSelectInvoice,
  onRequestDelete,
  reminderLoadingId
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
      {/* 1. Invoices Ledger */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200 flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              Invoices Ledger
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              {invoices.length}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Click row for details
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[420px] overflow-y-auto flex-1">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No invoices in ledger</div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => onSelectInvoice(inv)}
                className="p-4 sm:p-4.5 flex items-center justify-between text-xs transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      #{inv.invoiceNumber}
                    </span>
                    {inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 truncate font-medium mt-0.5">
                    {inv.customerName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Total: ${(inv.totalAmountCents / 100).toFixed(2)} • Received: ${((inv.paidAmountCents || 0) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="text-right space-y-1.5 shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : inv.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    {inv.status === 'PAID' ? 'PAID' : inv.status === 'PARTIALLY_PAID' ? 'PARTIAL' : 'PENDING'}
                  </span>

                  <div className="flex items-center gap-2 justify-end text-[11px] font-semibold">
                    {inv.status !== 'PAID' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateReminder(inv);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                        title="Draft AI reminder email"
                      >
                        {reminderLoadingId === inv.id ? (
                          <span className="flex items-center gap-1"><RingSpinner size={11} /> Drafting…</span>
                        ) : (
                          'Draft Reminder'
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(inv);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete invoice"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. PayPal Bank Feed */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200 flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              PayPal Bank Feed
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              {transactions.length}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Raw Gateway Activity
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[420px] overflow-y-auto flex-1">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No bank transactions found</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 sm:p-4.5 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="pr-3">
                  <div className="font-bold text-slate-900 dark:text-white font-mono text-xs sm:text-sm">
                    {tx.payerName || 'Direct PayPal Deposit'}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[200px] sm:max-w-xs mt-0.5">
                    {tx.note || 'No transaction note'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Gross: ${(tx.grossAmountCents / 100).toFixed(2)} • Fee: <span className="text-rose-500 font-semibold">${(tx.feeAmountCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right space-y-1.5 shrink-0">
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm">
                    +${(tx.netAmountCents / 100).toFixed(2)}
                  </div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      tx.status === 'RECONCILED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
