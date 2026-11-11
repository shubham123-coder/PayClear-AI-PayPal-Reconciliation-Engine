// frontend/src/components/ConfirmDeleteModal.jsx
// Smooth in-app confirmation dialog shown before deleting an invoice.
// Displays the invoice summary and requires an explicit final delete click.
import React, { useEffect, useState } from 'react';
import RingSpinner from './RingSpinner';

const STATUS_LABEL = {
  PAID: 'Paid in Full',
  PARTIALLY_PAID: 'Partially Paid',
  SENT: 'Pending Payment'
};

function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function ConfirmDeleteModal({ invoice, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape (unless a delete is in flight)
  useEffect(() => {
    if (!invoice) return undefined;
    function onKey(event) {
      if (event.key === 'Escape' && !deleting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [invoice, deleting, onClose]);

  if (!invoice) return null;

  const paid = invoice.paidAmountCents || 0;
  const outstanding = invoice.totalAmountCents - paid;

  async function handleConfirm() {
    setDeleting(true);
    setError('');
    try {
      await onConfirm(invoice);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete the invoice. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
            🗑
          </span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-white text-sm tracking-tight">Delete this invoice?</h3>
            <p className="text-[11px] text-white/80 font-mono truncate">
              Invoice #{invoice.invoiceNumber} • {invoice.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="ml-auto text-white/70 hover:text-white font-bold p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Invoice summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-850">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Amount Billed</div>
              <div className="font-extrabold font-mono text-slate-900 dark:text-white text-sm">{money(invoice.totalAmountCents)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-850">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Status</div>
              <div className="font-bold text-slate-800 dark:text-slate-100">
                {STATUS_LABEL[invoice.status] || invoice.status}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-850">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Already Paid</div>
              <div className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-sm">{money(paid)}</div>
            </div>
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-850">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Outstanding</div>
              <div className={`font-extrabold font-mono text-sm ${outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                {money(outstanding)}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-rose-700 dark:text-rose-300">
            <div className="font-bold text-[11px] mb-1 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>This action is irreversible</span>
            </div>
            <div className="text-[11px] leading-relaxed text-rose-800/80 dark:text-rose-300/80">
              Deleting will permanently remove this invoice and all associated reconciliation matches from your ledger.
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-red-700 dark:text-red-300 text-[11px] font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition-all shadow-md shadow-rose-600/20 disabled:opacity-60"
            >
              {deleting ? <RingSpinner size={12} className="text-white" /> : '🗑'}
              <span>{deleting ? 'Deleting…' : 'Delete Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
