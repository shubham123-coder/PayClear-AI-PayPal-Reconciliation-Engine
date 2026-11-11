// frontend/src/components/ReminderModal.jsx
// Shows an AI-drafted reminder with copy + direct-email options.
// If the server has no SMTP configured, offers browser-based compose
// links (Gmail / Outlook web) so no OS "choose an app" dialog appears.
import React, { useState, useEffect } from 'react';
import RingSpinner from './RingSpinner';

function parseReminder(text) {
  const lines = (text || '').split('\n');
  if (lines[0] && /subject\s*:/i.test(lines[0])) {
    return {
      subject: lines[0].replace(/subject\s*:\s*/i, '').trim(),
      body: lines.slice(1).join('\n').trim()
    };
  }
  return { subject: 'Friendly Payment Reminder', body: text || '' };
}

export default function ReminderModal({ activeReminder, onClose, onSendEmail }) {
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(null); // { to, text }

  useEffect(() => {
    setRecipient(activeReminder?.invoice?.customerEmail || '');
    setFallback(activeReminder?.fallback || null);
    setCopied(false);
  }, [activeReminder?.invoice?.id, activeReminder?.fallback]);

  if (!activeReminder) return null;

  function handleCopy() {
    navigator.clipboard.writeText(activeReminder.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    if (!recipient) {
      alert('Please enter a recipient email address.');
      return;
    }
    setSending(true);
    try {
      const res = await onSendEmail(activeReminder.invoice, recipient, activeReminder.text);
      if (res && res.sent === false) {
        // No SMTP on the server → offer browser compose links
        setFallback({ to: res.to || recipient, text: res.reminderText || activeReminder.text });
      }
    } catch (err) {
      alert('Error sending reminder email: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  // Browser compose URLs
  const compose = fallback ? (() => {
    const { subject, body } = parseReminder(fallback.text);
    const to = encodeURIComponent(fallback.to || '');
    const su = encodeURIComponent(subject);
    const bd = encodeURIComponent(body);
    return {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${bd}`,
      mailto: `mailto:${fallback.to}?subject=${su}&body=${bd}`
    };
  })() : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
              ✉️
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                AI Follow-up Reminder
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Invoice #{activeReminder.invoice.invoiceNumber} • {activeReminder.invoice.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Recipient Field */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Recipient Client Email
          </label>
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="client@company.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Draft Message Body */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            AI Generated Draft
          </label>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
            {activeReminder.text}
          </div>
        </div>

        {/* Fallback Compose Options (when server has no SMTP) */}
        {compose && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2 animate-fadeIn">
            <div className="font-bold text-indigo-950 dark:text-indigo-200 text-[11px] flex items-center gap-1.5">
              <span>🌐</span>
              <span>Direct SMTP not configured — Send from your browser:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={compose.gmail}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Compose in Gmail ↗</span>
              </a>
              <a
                href={compose.outlook}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Outlook Web ↗</span>
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {sending ? <RingSpinner size={12} className="text-white" /> : <span>🚀</span>}
              <span>{sending ? 'Sending…' : 'Send Reminder Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
