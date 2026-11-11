// frontend/src/components/InvoiceDetailModal.jsx
// Full detail view for a single invoice: status, payment progress,
// reminders, per-invoice AI insights, email and delete actions.
import React, { useState, useEffect } from 'react';
import RingSpinner from './RingSpinner';

const STATUS_META = {
  PAID: { label: 'Paid in Full', badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' },
  PARTIALLY_PAID: { label: 'Partially Paid', badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' },
  SENT: { label: 'Pending Payment', badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' }
};

function Money({ cents, className = '' }) {
  return <span className={`font-mono ${className}`}>${((cents || 0) / 100).toFixed(2)}</span>;
}

export default function InvoiceDetailModal({
  invoice,
  onClose,
  onGenerateReminder,
  onSendReminder,
  onExplain,
  onRequestDelete
}) {
  const [reminderLoading, setReminderLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState(null);
  const [recipient, setRecipient] = useState('');

  // Reset transient state whenever a different invoice is opened
  useEffect(() => {
    setRecipient(invoice?.customerEmail || '');
    setAiText(null);
  }, [invoice?.id]);

  if (!invoice) return null;

  const meta = STATUS_META[invoice.status] || {
    label: invoice.status,
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200'
  };
  const paidCents = invoice.paidAmountCents || 0;
  const remainingCents = invoice.totalAmountCents - paidCents;
  const progress = invoice.totalAmountCents > 0 ? Math.min(100, (paidCents / invoice.totalAmountCents) * 100) : 0;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';

  async function run(setter, action) {
    setter(true);
    try {
      await action();
    } catch (err) {
      alert(err.message);
    } finally {
      setter(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl animate-scaleIn flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg font-mono text-slate-900 dark:text-white tracking-tight">
                #{invoice.invoiceNumber}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${meta.badge}`}>
                {meta.label}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  Overdue
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{invoice.customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                Total Billed
              </span>
              <div className="font-extrabold text-slate-900 dark:text-white font-mono text-sm sm:text-base mt-0.5">
                <Money cents={invoice.totalAmountCents} />
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                Settled in Bank
              </span>
              <div className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm sm:text-base mt-0.5">
                <Money cents={paidCents} />
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                Outstanding
              </span>
              <div className={`font-extrabold font-mono text-sm sm:text-base mt-0.5 ${remainingCents > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                <Money cents={remainingCents} />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Payment Collection</span>
              <span className="font-bold text-slate-900 dark:text-white">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Metadata pills */}
          <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Recipient Email:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{invoice.customerEmail || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Due Date:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PayPal Reference ID:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {invoice.paypalInvoiceId || 'None'}
              </span>
            </div>
          </div>

          {/* Per-invoice AI Analysis */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
                <span>🤖</span>
                <span>AI Ledger Insight</span>
              </span>
              {!aiText && (
                <button
                  type="button"
                  onClick={() => run(setAiLoading, async () => {
                    const text = await onExplain(invoice);
                    setAiText(text);
                  })}
                  disabled={aiLoading}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {aiLoading ? <RingSpinner size={11} /> : null}
                  <span>{aiLoading ? 'Analyzing…' : 'Generate Summary'}</span>
                </button>
              )}
            </div>

            {aiText ? (
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed animate-fadeIn">
                {aiText}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Click "Generate Summary" to get an AI breakdown of this invoice's collection health and next action.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Operations */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#070D18] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestDelete(invoice);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 text-xs font-semibold text-slate-500 dark:text-slate-400 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>🗑</span>
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            {invoice.status !== 'PAID' && (
              <button
                type="button"
                onClick={() => run(setReminderLoading, async () => {
                  await onGenerateReminder(invoice);
                })}
                disabled={reminderLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold active:scale-95 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {reminderLoading ? <RingSpinner size={12} className="text-white" /> : <span>✉️</span>}
                <span>Draft Reminder</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
