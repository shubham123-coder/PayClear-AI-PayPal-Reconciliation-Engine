// frontend/src/components/InvoiceModal.jsx
import React, { useState } from 'react';
import RingSpinner from './RingSpinner';

export default function InvoiceModal({ isOpen, onClose, onCreateInvoice, suggestedNumber }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateInvoice({
        invoiceNumber,
        customerName,
        customerEmail,
        amountDollars,
        dueDate: dueDate || undefined
      });
      // Reset form on success
      setInvoiceNumber('');
      setCustomerName('');
      setCustomerEmail('');
      setAmountDollars('');
      setDueDate('');
      onClose();
    } catch (err) {
      alert('Failed to create invoice: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              Issue New Invoice
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Registers invoice and syncs with PayPal Sandbox
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Invoice Identifier
            </label>
            <input
              type="text"
              required
              placeholder="e.g. INV-2025-004 or 101"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {suggestedNumber && !invoiceNumber && (
              <button
                type="button"
                onClick={() => setInvoiceNumber(`INV-2025-${String(suggestedNumber).padStart(3, '0')}`)}
                className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 font-mono"
              >
                ✨ Suggest: INV-2025-{String(suggestedNumber).padStart(3, '0')}
              </button>
            )}
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Customer / Company Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp or Jane Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Customer Billing Email
            </label>
            <input
              type="email"
              placeholder="billing@client.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Total Billed (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="1200.00"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-[11px]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <RingSpinner size={13} className="text-white" /> : null}
              <span>{submitting ? 'Creating…' : 'Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
