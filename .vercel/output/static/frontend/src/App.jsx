// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { api } from './api';

// Modular UI Components
import LandingPage from './components/LandingPage';
import Navbar from './components/Navbar';
import HowItWorks from './components/HowItWorks';
import ActionBar from './components/ActionBar';
import ReconciliationProgress from './components/ReconciliationProgress';
import KpiCards from './components/KpiCards';
import ProfitGuard from './components/ProfitGuard';
import MatchQueue from './components/MatchQueue';
import LedgerTables from './components/LedgerTables';
import CopilotDrawer from './components/CopilotDrawer';
import InvoiceModal from './components/InvoiceModal';
import ReminderModal from './components/ReminderModal';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

const DEFAULT_COPILOT_MESSAGE = {
  role: 'assistant',
  text: "Hi! I'm your PayClear AI Copilot. Ask me anything about your PayPal fees, missing payments, or outstanding invoices."
};

export default function App() {
  // Theme & Session State
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('payclear_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Financial Data State
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [feeAnalytics, setFeeAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  // Dialog & Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reminderLoadingId, setReminderLoadingId] = useState(null);
  const [reconProgress, setReconProgress] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // Floating AI Copilot State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotExpanded, setCopilotExpanded] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState([DEFAULT_COPILOT_MESSAGE]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Synchronize Dark Mode Class with <html> Element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load Ledger Data & Isolated Chat History upon login
  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadCopilotHistory();
    } else {
      setCopilotMessages([DEFAULT_COPILOT_MESSAGE]);
      setInvoices([]);
      setTransactions([]);
      setMatches([]);
      setFeeAnalytics(null);
    }
  }, [user]);

  async function loadCopilotHistory() {
    try {
      const history = await api.getCopilotHistory();
      if (Array.isArray(history) && history.length > 0) {
        setCopilotMessages(history);
      } else {
        setCopilotMessages([DEFAULT_COPILOT_MESSAGE]);
      }
    } catch (err) {
      console.warn('Failed to load user chat history:', err);
      setCopilotMessages([DEFAULT_COPILOT_MESSAGE]);
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [invs, txns, mtchs, fees] = await Promise.all([
        api.getInvoices(),
        api.getTransactions(),
        api.getMatches(),
        api.getFeeAnalytics()
      ]);
      setInvoices(invs);
      setTransactions(txns);
      setMatches(mtchs);
      setFeeAnalytics(fees);
    } catch (err) {
      console.error(err);
      setStatusNotice('Failed to refresh data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Authentication Handlers ---
  async function handleLogin(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('payclear_token', data.token);
    localStorage.setItem('payclear_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function handleRegister(name, email, password) {
    const data = await api.register(name, email, password);
    localStorage.setItem('payclear_token', data.token);
    localStorage.setItem('payclear_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function handleDemoLogin() {
    const data = await api.login('demo@payclear.app', 'demo1234');
    localStorage.setItem('payclear_token', data.token);
    localStorage.setItem('payclear_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function handleLogout() {
    localStorage.removeItem('payclear_token');
    localStorage.removeItem('payclear_user');
    setUser(null);
    setCopilotMessages([DEFAULT_COPILOT_MESSAGE]);
    setInvoices([]);
    setTransactions([]);
    setMatches([]);
    setFeeAnalytics(null);
  }

  // --- Dashboard Operations ---
  async function handleLoadScenarios() {
    setLoading(true);
    try {
      await api.loadScenarios();
      await loadDashboardData();
      setStatusNotice('Loaded 3 realistic hackathon scenarios! Click "Run AI Reconciliation" to match them.');
    } catch (err) {
      setStatusNotice('Error loading scenarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunReconciliation() {
    if (loading) return;
    setLoading(true);
    setStatusNotice('');
    setReconProgress({ percent: 6, stage: 'start', label: 'Starting the reconciliation engine…' });

    let doneMessage = '';
    let streamError = '';

    try {
      await api.runReconciliationStream((evt) => {
        if (evt.type === 'start') {
          setReconProgress({ percent: 10, stage: 'start', label: 'Connecting to the matching engine…' });
        } else if (evt.type === 'progress') {
          if (evt.stage === 'scanning') {
            const inv = evt.invoices === 1 ? 'invoice' : 'invoices';
            const tx = evt.transactions === 1 ? 'payment' : 'payments';
            setReconProgress({
              percent: 18,
              stage: 'scanning',
              label: `Scanning ${evt.invoices} pending ${inv} against ${evt.transactions} bank ${tx}…`
            });
          } else if (evt.stage === 'matching') {
            const pct = 20 + Math.round((evt.index / Math.max(evt.total, 1)) * 75);
            setReconProgress({
              percent: Math.min(pct, 95),
              stage: 'matching',
              current: evt.index,
              total: evt.total,
              label: `AI is explaining match ${evt.index} of ${evt.total} — invoice #${evt.invoiceNumber} (${evt.matchType.replace(/_/g, ' ')})…`
            });
          } else if (evt.stage === 'no-matches') {
            setReconProgress({
              percent: 92,
              stage: 'matching',
              label: 'No new candidate matches found. Finishing up…'
            });
          }
        } else if (evt.type === 'done') {
          doneMessage = evt.message;
          setReconProgress({ percent: 100, stage: 'done', label: evt.message });
        } else if (evt.type === 'error') {
          streamError = evt.message || 'Reconciliation failed.';
        }
      });

      if (streamError) throw new Error(streamError);

      await loadDashboardData();
      setStatusNotice(doneMessage || 'AI Reconciliation run complete.');
    } catch (err) {
      // Fallback to the non-streaming endpoint if live progress is unavailable
      try {
        const res = await api.runReconciliation();
        await loadDashboardData();
        setStatusNotice(res.message || 'AI Reconciliation run complete.');
        setReconProgress({ percent: 100, stage: 'done', label: res.message || 'Reconciliation complete.' });
      } catch (fallbackErr) {
        setStatusNotice('Reconciliation error: ' + fallbackErr.message);
        setReconProgress({ percent: 100, stage: 'error', label: fallbackErr.message });
      }
    } finally {
      setLoading(false);
      // Keep the completed bar visible briefly, then fade it away
      window.setTimeout(() => setReconProgress(null), 3500);
    }
  }

  async function handleConfirmMatch(matchId) {
    try {
      await api.confirmMatch(matchId);
      await loadDashboardData();
      setStatusNotice('Match confirmed! Ledger updated atomically.');
    } catch (err) {
      alert('Error confirming match: ' + err.message);
    }
  }

  async function handleRejectMatch(matchId) {
    try {
      await api.rejectMatch(matchId);
      await loadDashboardData();
      setStatusNotice('Match rejected.');
    } catch (err) {
      alert('Error rejecting match: ' + err.message);
    }
  }

  async function handleCreateInvoice(invoiceData) {
    await api.createInvoice(invoiceData);
    await loadDashboardData();
    setStatusNotice('Invoice created and registered in ledger!');
  }

  async function handleGenerateReminder(invoice) {
    setReminderLoadingId(invoice.id);
    setActiveReminder(null);
    try {
      const res = await api.getInvoiceReminder(invoice.id);
      setActiveReminder({ invoice, text: res.reminder });
      return res.reminder;
    } catch (err) {
      setStatusNotice('Error drafting reminder: ' + err.message);
      throw err;
    } finally {
      setReminderLoadingId(null);
    }
  }

  async function handleSendReminder(invoice, to, reminderText) {
    setStatusNotice('');
    try {
      const res = await api.sendReminderEmail(invoice.id, to, reminderText);
      setStatusNotice(res.message || `Reminder sent to ${to}!`);
      return { sent: true };
    } catch (err) {
      if (/not configured/i.test(err.message)) {
        // No SMTP on the server → let the UI offer browser-based compose
        let text = reminderText;
        if (!text) {
          const res = await api.getInvoiceReminder(invoice.id);
          text = res.reminder;
        }
        setStatusNotice('Direct email is not configured on this server — pick Gmail or Outlook to send it from your browser.');
        return { sent: false, to, reminderText: text };
      }
      throw err;
    }
  }

  async function handleExplainInvoice(invoice) {
    const res = await api.explainInvoice(invoice.id);
    return res.explanation;
  }

  async function handleDeleteInvoice(invoice) {
    try {
      const res = await api.deleteInvoice(invoice.id);
      if (selectedInvoiceId === invoice.id) setSelectedInvoiceId(null);
      await loadDashboardData();
      setStatusNotice(res.message || 'Invoice deleted.');
      return res.message;
    } catch (err) {
      setStatusNotice('Error deleting invoice: ' + err.message);
      throw err;
    }
  }

  async function handleDownloadAuditTrail() {
    try {
      await api.downloadAuditTrailCsv();
    } catch (err) {
      alert('Failed to download audit trail: ' + err.message);
    }
  }

  async function handleSendCopilotMessage(questionOverride) {
    const question = questionOverride || copilotInput;
    if (!question || !question.trim()) return;

    const trimmed = question.trim();
    const userMsg = { role: 'user', text: trimmed };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      const res = await api.askCopilot(trimmed);
      const assistantMsg = res.assistantMessage || { role: 'assistant', text: res.answer };
      setCopilotMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error contacting AI Copilot. Check backend terminal for details.' }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  }

  async function handleClearCopilotHistory() {
    try {
      await api.clearCopilotHistory();
      setCopilotMessages([DEFAULT_COPILOT_MESSAGE]);
      setStatusNotice('Your AI chat history has been cleared.');
    } catch (err) {
      console.error(err);
      setStatusNotice('Failed to clear chat history: ' + err.message);
    }
  }

  // ==========================================
  // UNCONNECTED: PUBLIC LANDING PAGE
  // ==========================================
  if (!user) {
    return (
      <LandingPage
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  // ==========================================
  // CONNECTED: MAIN APPLICATION DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Ambient Top Glow for Deep Obsidian Canvas */}
      <div className="ambient-glow-top" />

      {/* Top Navigation */}
      <Navbar
        user={user}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8 relative z-10">
        
        {/* Banner Notice */}
        {statusNotice && (
          <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 animate-slideUp shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-base">💡</span>
              <span className="font-semibold">{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice('')}
              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 font-bold ml-4 p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4-Step Usage Guide (dismissible — great for judge walkthroughs) */}
        {showGuide && <HowItWorks onDismiss={() => setShowGuide(false)} />}

        {/* Action Operations Bar */}
        <ActionBar
          loading={loading}
          onLoadScenarios={handleLoadScenarios}
          onRunReconciliation={handleRunReconciliation}
          onDownloadAuditTrail={handleDownloadAuditTrail}
          onOpenNewInvoiceModal={() => setShowInvoiceModal(true)}
        />

        {/* Live reconciliation progress */}
        <ReconciliationProgress progress={reconProgress} />

        {/* 4 Financial KPI Cards */}
        <KpiCards
          invoices={invoices}
          transactions={transactions}
          matches={matches}
          feeAnalytics={feeAnalytics}
        />

        {/* Standout Feature 1: Profit Guard & Fee Leakage */}
        <ProfitGuard
          feeAnalytics={feeAnalytics}
          onAskCopilotAdvice={() => {
            setCopilotOpen(true);
            handleSendCopilotMessage("How can I minimize my PayPal fees based on my current invoices?");
          }}
        />

        {/* AI Suggested Match Decision Center */}
        <MatchQueue
          matches={matches}
          onConfirmMatch={handleConfirmMatch}
          onRejectMatch={handleRejectMatch}
        />

        {/* Ledger Tables (Invoices & Raw PayPal Bank Feed) */}
        <LedgerTables
          invoices={invoices}
          transactions={transactions}
          onGenerateReminder={handleGenerateReminder}
          onSelectInvoice={(inv) => setSelectedInvoiceId(inv.id)}
          onRequestDelete={(inv) => setDeleteTarget(inv)}
          reminderLoadingId={reminderLoadingId}
        />

      </main>

      {/* Floating AI Copilot (With Smooth Expand & Backdrop Blur) */}
      <CopilotDrawer
        isOpen={copilotOpen}
        setIsOpen={setCopilotOpen}
        isExpanded={copilotExpanded}
        setIsExpanded={setCopilotExpanded}
        messages={copilotMessages}
        input={copilotInput}
        setInput={setCopilotInput}
        loading={copilotLoading}
        onSendMessage={handleSendCopilotMessage}
        onClearHistory={handleClearCopilotHistory}
      />

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onCreateInvoice={handleCreateInvoice}
        suggestedNumber={invoices.length + 1}
      />

      <ReminderModal
        activeReminder={activeReminder}
        onClose={() => setActiveReminder(null)}
        onSendEmail={handleSendReminder}
      />

      <InvoiceDetailModal
        invoice={invoices.find((inv) => inv.id === selectedInvoiceId) || null}
        onClose={() => setSelectedInvoiceId(null)}
        onGenerateReminder={handleGenerateReminder}
        onSendReminder={async (inv, to) => {
          const res = await handleSendReminder(inv, to, null);
          if (res && res.sent === false) {
            // Show the reminder above the detail modal with compose options ready
            setActiveReminder({
              invoice: inv,
              text: res.reminderText,
              fallback: { to: res.to || to, text: res.reminderText }
            });
          }
          return res;
        }}
        onExplain={handleExplainInvoice}
        onRequestDelete={(inv) => setDeleteTarget(inv)}
      />

      <ConfirmDeleteModal
        invoice={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}