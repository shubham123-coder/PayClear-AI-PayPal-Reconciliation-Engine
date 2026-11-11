// frontend/src/api.js
// Centralized API client for PayClear backend communication

// Uses VITE_API_URL environment variable when deployed (e.g. on Vercel),
// falling back to local Express server for local development.
const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = rawBase.replace(/\/+$/, '').endsWith('/api')
  ? rawBase.replace(/\/+$/, '')
  : `${rawBase.replace(/\/+$/, '')}/api`;

/**
 * Core fetch helper that attaches JWT authentication token automatically
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('payclear_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If token expired, clear stored session
    localStorage.removeItem('payclear_token');
    localStorage.removeItem('payclear_user');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (name, email, password, businessName) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, businessName })
    }),

  getMe: () => request('/auth/me'),

  // Invoices & Transactions
  getInvoices: () => request('/invoices'),
  createInvoice: (data) =>
    request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getInvoiceReminder: (invoiceId) =>
    request(`/invoices/${invoiceId}/reminder`, { method: 'POST' }),
  sendReminderEmail: (invoiceId, to, reminderText) =>
    request(`/invoices/${invoiceId}/reminder/send`, {
      method: 'POST',
      body: JSON.stringify({ to, reminderText })
    }),
  explainInvoice: (invoiceId) =>
    request(`/invoices/${invoiceId}/ai-explain`, { method: 'POST' }),
  deleteInvoice: (invoiceId) =>
    request(`/invoices/${invoiceId}`, { method: 'DELETE' }),
  getTransactions: () => request('/transactions'),

  // Reconciliation
  runReconciliation: () => request('/reconciliation/run', { method: 'POST' }),

  /**
   * Runs reconciliation and streams live progress events (SSE over fetch).
   * onEvent receives { type: 'start' | 'progress' | 'done' | 'error', ... }.
   */
  runReconciliationStream: async (onEvent) => {
    const token = localStorage.getItem('payclear_token');
    const response = await fetch(`${API_BASE}/reconciliation/run/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: '{}'
    });

    if (response.status === 401) {
      localStorage.removeItem('payclear_token');
      localStorage.removeItem('payclear_user');
    }

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));
        if (!dataLine) continue;
        try {
          onEvent(JSON.parse(dataLine.slice(6)));
        } catch {
          // Ignore malformed keep-alive / partial frames
        }
      }
    }
  },
  getMatches: () => request('/reconciliation/matches'),
  confirmMatch: (matchId) => request(`/reconciliation/confirm/${matchId}`, { method: 'POST' }),
  rejectMatch: (matchId) => request(`/reconciliation/reject/${matchId}`, { method: 'POST' }),

  // Standout Features
  getFeeAnalytics: () => request('/analytics/fee-leakage'),
  loadScenarios: () => request('/scenarios/load', { method: 'POST' }),
  askCopilot: (question) =>
    request('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ question })
    }),
  getCopilotHistory: () => request('/copilot/history'),
  clearCopilotHistory: () => request('/copilot/history', { method: 'DELETE' }),

  // CSV Audit Trail Download Helper
  downloadAuditTrailCsv: async () => {
    const token = localStorage.getItem('payclear_token');
    const response = await fetch(`${API_BASE}/audit-trail/export`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });

    if (!response.ok) throw new Error('Failed to download audit trail');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayClear-Audit-Trail-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};
