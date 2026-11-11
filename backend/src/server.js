// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const { createDraftInvoice } = require('./services/paypalService');
const { findMatches } = require('./services/matchingEngine');
const { explainMatchDiscrepancy, draftInvoiceReminder, explainInvoice, askCopilot } = require('./services/aiService');
const { sendReminderEmail, splitSubjectAndBody } = require('./services/emailService');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'payclear-super-secret-jwt-key-2025';

app.use(cors());
app.use(express.json());

// ==========================================
// 1. AUTHENTICATION MIDDLEWARE
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = user; // user = { id, email }
    next();
  });
}

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        businessName: (businessName || `${name.trim()}'s Studio`).trim()
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, businessName: user.businessName }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to create account.' });
  }
});

// Login (Supports instant Demo Mode)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Auto-seed demo account if requested by judges/demo button
    if (!user && email.toLowerCase() === 'demo@payclear.app') {
      const demoHash = await bcrypt.hash('demo1234', 10);
      user = await prisma.user.create({
        data: {
          email: 'demo@payclear.app',
          passwordHash: demoHash,
          name: 'Alex Rivera (Demo)',
          businessName: 'Rivera Creative Studio'
        }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, businessName: user.businessName }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to authenticate.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, businessName: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// ==========================================
// 3. INVOICES & TRANSACTIONS (USER ISOLATED)
// ==========================================

// Get all invoices for logged-in user
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

// Create Invoice (Robust with Foreign Key and Unique Constraints)
app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { invoiceNumber, customerName, customerEmail, amountDollars, dueDate } = req.body;
    
    if (!invoiceNumber || !customerName || !amountDollars) {
      return res.status(400).json({ error: 'Invoice number, customer name, and amount are required.' });
    }

    const parsedAmount = parseFloat(amountDollars);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive dollar amount.' });
    }

    // Verify user exists in the database
    let currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) {
      // If user ID was wiped or invalidated, fallback to finding by token email
      currentUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!currentUser) {
        return res.status(401).json({ error: 'Your session has expired. Please logout and log back in.' });
      }
    }

    const totalAmountCents = Math.round(parsedAmount * 100);

    // Call PayPal Sandbox (Resilient fallback ensures a safe ID is always returned)
    const paypalRes = await createDraftInvoice({
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail ? customerEmail.trim() : 'client@example.com',
      amountDollars: parsedAmount
    });

    const invoice = await prisma.invoice.create({
      data: {
        userId: currentUser.id,
        paypalInvoiceId: paypalRes.paypalInvoiceId,
        invoiceNumber: invoiceNumber.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail ? customerEmail.trim() : 'client@example.com',
        totalAmountCents,
        currency: 'USD',
        status: 'SENT',
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice.' });
  }
});

// Draft AI Reminder for Unpaid Invoice
app.post('/api/invoices/:id/reminder', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const reminder = await draftInvoiceReminder(invoice);
    res.json({ reminder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate reminder.' });
  }
});

// Send Reminder directly to the client's inbox via SMTP
app.post('/api/invoices/:id/reminder/send', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const to = (req.body.to || invoice.customerEmail || '').trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }

    // Use the drafted reminder text if provided, otherwise generate one
    const reminderText = req.body.reminderText || await draftInvoiceReminder(invoice);
    const { subject, body } = splitSubjectAndBody(reminderText);

    const result = await sendReminderEmail({
      to,
      subject: `${subject} — Invoice #${invoice.invoiceNumber}`,
      body
    });

    if (!result.sent) {
      return res.status(501).json({
        error: 'Email sending is not configured on the server (SMTP settings missing). Use the mailto: option instead.',
        reason: result.reason,
        reminderText
      });
    }

    res.json({ message: `Reminder emailed to ${to}.` });
  } catch (error) {
    console.error('Reminder email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send reminder email.' });
  }
});

// Per-invoice AI info: status summary & recommended next action
app.post('/api/invoices/:id/ai-explain', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const [confirmedMatchCount, suggestedMatchCount] = await Promise.all([
      prisma.reconciliationMatch.count({
        where: { invoiceId: invoice.id, status: 'CONFIRMED' }
      }),
      prisma.reconciliationMatch.count({
        where: { invoiceId: invoice.id, status: 'SUGGESTED' }
      })
    ]);

    const explanation = await explainInvoice(invoice, { confirmedMatchCount, suggestedMatchCount });
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to explain invoice.' });
  }
});

// Delete an Invoice (owner-only, atomic: removes matches first)
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    await prisma.$transaction(async (tx) => {
      await tx.reconciliationMatch.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoice.delete({ where: { id: invoice.id } });
    });

    res.json({ message: `Invoice #${invoice.invoiceNumber} deleted from your ledger.` });
  } catch (error) {
    console.error('Invoice deletion error:', error);
    res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

// Get all transactions for logged-in user
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { transactionDate: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// ==========================================
// 4. RECONCILIATION ENGINE & MATCHING
// ==========================================

// Run Reconciliation
/**
 * Shared reconciliation routine used by both the JSON and streaming endpoints.
 * `onProgress` receives live stage updates so the UI can render a real progress bar.
 */
async function reconcileForUser(userId, onProgress = () => {}) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: { in: ['SENT', 'PARTIALLY_PAID'] } }
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: 'UNRECONCILED' }
  });

  onProgress({
    stage: 'scanning',
    invoices: invoices.length,
    transactions: transactions.length
  });

  const candidates = findMatches(invoices, transactions);

  // Drop pairs that already have a match record (suggested/confirmed/rejected)
  const freshMatches = [];
  for (const match of candidates) {
    const existing = await prisma.reconciliationMatch.findFirst({
      where: { invoiceId: match.invoice.id, transactionId: match.transaction.id }
    });
    if (!existing) freshMatches.push(match);
  }

  if (freshMatches.length === 0) {
    onProgress({ stage: 'no-matches', invoices: invoices.length, transactions: transactions.length });
    return [];
  }

  const savedMatches = [];

  for (let i = 0; i < freshMatches.length; i++) {
    const match = freshMatches[i];

    const aiExplanation = await explainMatchDiscrepancy(match.invoice, match.transaction, match.matchType);

    const saved = await prisma.reconciliationMatch.create({
      data: {
        invoiceId: match.invoice.id,
        transactionId: match.transaction.id,
        matchType: match.matchType,
        confidenceScore: match.confidenceScore,
        aiExplanation,
        status: 'SUGGESTED',
        isSimulation: match.invoice.isSimulation && match.transaction.isSimulation
      },
      include: { invoice: true, transaction: true }
    });

    savedMatches.push(saved);

    onProgress({
      stage: 'matching',
      index: i + 1,
      total: freshMatches.length,
      invoiceNumber: match.invoice.invoiceNumber,
      matchType: match.matchType,
      confidenceScore: match.confidenceScore
    });
  }

  return savedMatches;
}

// Run Reconciliation (standard JSON response)
app.post('/api/reconciliation/run', authenticateToken, async (req, res) => {
  try {
    const savedMatches = await reconcileForUser(req.user.id);
    res.json({ message: `Reconciliation complete. ${savedMatches.length} new matches found.`, matches: savedMatches });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: 'Reconciliation failed.' });
  }
});

// Run Reconciliation with live progress (Server-Sent Events)
app.post('/api/reconciliation/run/stream', authenticateToken, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (payload) => {
    if (res.writableEnded || res.destroyed) return;
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      console.warn('SSE write failed:', err.message);
    }
  };

  // Heartbeat keeps proxies/browsers from closing a long AI run early
  const heartbeat = setInterval(() => send({ type: 'ping' }), 15000);
  res.on('close', () => clearInterval(heartbeat));

  try {
    send({ type: 'start', message: 'Starting reconciliation…' });

    const savedMatches = await reconcileForUser(req.user.id, (progress) => {
      send({ type: 'progress', ...progress });
    });

    send({
      type: 'done',
      newMatches: savedMatches.length,
      matches: savedMatches,
      message: savedMatches.length > 0
        ? `Reconciliation complete. ${savedMatches.length} new match${savedMatches.length === 1 ? '' : 'es'} found.`
        : 'Reconciliation complete. No new matches found — everything is already reconciled.'
    });
  } catch (error) {
    console.error('Reconciliation stream error:', error);
    send({ type: 'error', message: 'Reconciliation failed. Please try again.' });
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
});

// Get Suggested Matches
app.get('/api/reconciliation/matches', authenticateToken, async (req, res) => {
  try {
    const matches = await prisma.reconciliationMatch.findMany({
      where: {
        status: 'SUGGESTED',
        invoice: { userId: req.user.id }
      },
      include: { invoice: true, transaction: true },
      orderBy: { confidenceScore: 'desc' }
    });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches.' });
  }
});

// Confirm Match (Atomic Database Transaction)
app.post('/api/reconciliation/confirm/:matchId', authenticateToken, async (req, res) => {
  try {
    const match = await prisma.reconciliationMatch.findUnique({
      where: { id: req.params.matchId },
      include: { invoice: true, transaction: true }
    });

    if (!match || match.invoice.userId !== req.user.id) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    if (match.status !== 'SUGGESTED' || match.transaction.status !== 'UNRECONCILED') {
      return res.status(409).json({ error: 'This match or payment has already been processed.' });
    }

    const paymentCents = match.transaction.grossAmountCents;
    const expectedPaidCents = match.invoice.paidAmountCents;
    if (paymentCents <= 0 || expectedPaidCents + paymentCents > match.invoice.totalAmountCents) {
      return res.status(409).json({ error: 'This payment would exceed the invoice balance.' });
    }

    // Atomic execution
    await prisma.$transaction(async (tx) => {
      const matchClaim = await tx.reconciliationMatch.updateMany({
        where: { id: match.id, status: 'SUGGESTED' },
        data: { status: 'CONFIRMED' }
      });
      if (matchClaim.count !== 1) throw new Error('MATCH_ALREADY_PROCESSED');

      const transactionClaim = await tx.transaction.updateMany({
        where: { id: match.transactionId, status: 'UNRECONCILED' },
        data: { status: 'RECONCILED' }
      });
      if (transactionClaim.count !== 1) throw new Error('TRANSACTION_ALREADY_PROCESSED');

      const newPaidCents = expectedPaidCents + paymentCents;
      const isFullyPaid = newPaidCents >= match.invoice.totalAmountCents;

      const invoiceClaim = await tx.invoice.updateMany({
        where: { id: match.invoiceId, paidAmountCents: expectedPaidCents, totalAmountCents: { gte: newPaidCents } },
        data: {
          paidAmountCents: newPaidCents,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID'
        }
      });
      if (invoiceClaim.count !== 1) throw new Error('INVOICE_BALANCE_CHANGED');
    });

    res.json({ message: 'Match successfully confirmed and ledger updated!' });
  } catch (error) {
    console.error('Confirmation error:', error);
    const conflictErrors = ['MATCH_ALREADY_PROCESSED', 'TRANSACTION_ALREADY_PROCESSED', 'INVOICE_BALANCE_CHANGED'];
    if (conflictErrors.includes(error.message)) {
      return res.status(409).json({ error: 'This match or payment has already been processed or changed.' });
    }
    res.status(500).json({ error: 'Failed to confirm match.' });
  }
});

// Reject Match
app.post('/api/reconciliation/reject/:matchId', authenticateToken, async (req, res) => {
  try {
    const match = await prisma.reconciliationMatch.findUnique({
      where: { id: req.params.matchId },
      include: { invoice: true }
    });

    if (!match || match.invoice.userId !== req.user.id) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    await prisma.reconciliationMatch.update({
      where: { id: req.params.matchId },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Match rejected.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject match.' });
  }
});

// ==========================================
// 5. STANDOUT FEATURES: ANALYTICS, SCENARIOS, CSV & COPILOT
// ==========================================

// Feature 1: Fee Leakage & Profit Guard Analytics
app.get('/api/analytics/fee-leakage', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id }
    });

    const totalGrossCents = transactions.reduce((sum, t) => sum + t.grossAmountCents, 0);
    const totalFeeCents = transactions.reduce((sum, t) => sum + t.feeAmountCents, 0);
    const totalNetCents = transactions.reduce((sum, t) => sum + t.netAmountCents, 0);

    const feePercentage = totalGrossCents > 0 ? ((totalFeeCents / totalGrossCents) * 100).toFixed(2) : '0.00';

    res.json({
      totalGrossDollars: (totalGrossCents / 100).toFixed(2),
      totalFeeDollars: (totalFeeCents / 100).toFixed(2),
      totalNetDollars: (totalNetCents / 100).toFixed(2),
      feePercentage,
      transactionCount: transactions.length,
      recommendation: totalFeeCents > 5000 
        ? "You've spent over $50 in processing fees. Consider adding a 'Bank Transfer / ACH' option for invoices over $1,000 to save up to 2.9%." 
        : "Fee levels are within standard merchant boundaries (under 3.5%)."
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute fee leakage.' });
  }
});

// Feature 2: 1-Click Scenario Simulator
app.post('/api/scenarios/load', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Remove previous SIMULATION data only — the user's own invoices are preserved
    await prisma.reconciliationMatch.deleteMany({ where: { isSimulation: true, invoice: { userId } } });
    await prisma.transaction.deleteMany({ where: { userId, isSimulation: true } });
    await prisma.invoice.deleteMany({
      where: { userId, isSimulation: true }
    });

    // Skip invoice seeding if the scenarios already exist (idempotent)
    const existingSimCount = await prisma.invoice.count({
      where: { userId, isSimulation: true }
    });

    if (existingSimCount === 0) {
    // Scenario A: Standard Match with Fees (Acme Corp)
    await prisma.invoice.create({
      data: {
        userId,
        paypalInvoiceId: `INV2-SIM-001-${Date.now()}`,
        isSimulation: true,
        invoiceNumber: 'INV-2025-001',
        customerName: 'Acme Technologies',
        customerEmail: 'billing@acme.com',
        totalAmountCents: 120000, // $1,200.00
        status: 'SENT',
        dueDate: new Date(Date.now() + 86400000 * 7)
      }
    });

    await prisma.transaction.create({
      data: {
        userId,
        paypalTransactionId: `TXN-SIM-001-${Date.now()}`,
        isSimulation: true,
        payerName: 'Acme Technologies',
        payerEmail: 'billing@acme.com',
        grossAmountCents: 120000, // $1,200.00
        feeAmountCents: 4237,     // $42.37 PayPal Fee (3.49% + $0.49: $41.88 + $0.49)
        netAmountCents: 115763,   // $1,157.63 Net Received ($1,200.00 - $42.37)
        transactionDate: new Date(),
        note: 'Payment for INV-2025-001'
      }
    });

    // Scenario B: Partial Payment / Milestone (Global Design Studio)
    await prisma.invoice.create({
      data: {
        userId,
        paypalInvoiceId: `INV2-SIM-002-${Date.now()}`,
        isSimulation: true,
        invoiceNumber: 'INV-2025-002',
        customerName: 'Global Design Studio',
        customerEmail: 'finance@globaldesign.com',
        totalAmountCents: 350000, // $3,500.00
        status: 'SENT',
        dueDate: new Date(Date.now() + 86400000 * 14)
      }
    });

    await prisma.transaction.create({
      data: {
        userId,
        paypalTransactionId: `TXN-SIM-002-${Date.now()}`,
        isSimulation: true,
        payerName: 'Global Design Studio',
        payerEmail: 'finance@globaldesign.com',
        grossAmountCents: 175000, // $1,750.00 (50% Milestone 1)
        feeAmountCents: 6157,     // $61.57 Fee
        netAmountCents: 168843,   // $1,688.43 Net
        transactionDate: new Date(),
        note: 'Milestone 1 Deposit'
      }
    });

    // Scenario C: Name Mismatch Edge Case (Parent Holding Company)
    await prisma.invoice.create({
      data: {
        userId,
        paypalInvoiceId: `INV2-SIM-003-${Date.now()}`,
        isSimulation: true,
        invoiceNumber: 'INV-2025-003',
        customerName: 'Nexus Labs',
        customerEmail: 'hello@nexuslabs.io',
        totalAmountCents: 85000, // $850.00
        status: 'SENT',
        dueDate: new Date(Date.now() + 86400000 * 3)
      }
    });

    await prisma.transaction.create({
      data: {
        userId,
        paypalTransactionId: `TXN-SIM-003-${Date.now()}`,
        isSimulation: true,
        payerName: 'Nexus Holdings LLC', // Parent company name
        payerEmail: 'hello@nexuslabs.io',
        grossAmountCents: 85000,
        feeAmountCents: 3016,
        netAmountCents: 81984,
        transactionDate: new Date(),
        note: 'Consulting services for INV-2025-003'
      }
    });
    } else {
      // Re-open SIM invoices if they were paid in a previous run,
      // so reconciliation can be demonstrated repeatedly
      await prisma.invoice.updateMany({
        where: { userId, isSimulation: true },
        data: { status: 'SENT', paidAmountCents: 0 }
      });
    }

    res.json({
      message: existingSimCount === 0
        ? 'Realistic scenario data successfully loaded! Your own invoices were kept safe.'
        : 'Simulation reloaded: transactions reset and scenarios re-opened. Your own invoices were kept safe.'
    });
  } catch (error) {
    console.error('Scenario load error:', error);
    res.status(500).json({ error: error.message || 'Failed to load simulator scenarios.' });
  }
});

// Feature 3: Tax-Ready Audit Trail (CSV Export)
app.get('/api/audit-trail/export', authenticateToken, async (req, res) => {
  try {
    const confirmedMatches = await prisma.reconciliationMatch.findMany({
      where: {
        status: 'CONFIRMED',
        invoice: { userId: req.user.id }
      },
      include: { invoice: true, transaction: true },
      orderBy: { createdAt: 'desc' }
    });

    let csvContent = 'Match Date,Invoice #,Client Name,Billed ($),Gross Paid ($),PayPal Fee ($),Net Deposited ($),Match Reason,PayPal Tx ID\n';

    confirmedMatches.forEach(m => {
      const matchDate = new Date(m.createdAt).toISOString().split('T')[0];
      const billed = (m.invoice.totalAmountCents / 100).toFixed(2);
      const gross = (m.transaction.grossAmountCents / 100).toFixed(2);
      const fee = (m.transaction.feeAmountCents / 100).toFixed(2);
      const net = (m.transaction.netAmountCents / 100).toFixed(2);
      
      csvContent += `"${matchDate}","${m.invoice.invoiceNumber}","${m.invoice.customerName}",${billed},${gross},${fee},${net},"${m.matchType}","${m.transaction.paypalTransactionId}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`PayClear-Audit-Trail-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate audit trail.' });
  }
});

// Feature 4: Live AI Financial Copilot Chat & History (User Isolated)

// Get Chat History for logged-in user
app.get('/api/copilot/history', authenticateToken, async (req, res) => {
  try {
    const history = await prisma.chatMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        text: true,
        createdAt: true
      }
    });
    res.json(history);
  } catch (error) {
    console.error('Fetch chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// Clear Chat History for logged-in user
app.delete('/api/copilot/history', authenticateToken, async (req, res) => {
  try {
    await prisma.chatMessage.deleteMany({
      where: { userId: req.user.id }
    });
    res.json({ message: 'Chat history cleared successfully.' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

// Send Chat Message & Record in User's History
app.post('/api/copilot/chat', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required.' });

    const trimmedQuestion = question.trim();

    // 1. Record user question in their chat history
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        role: 'user',
        text: trimmedQuestion
      }
    });

    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      select: { invoiceNumber: true, customerName: true, totalAmountCents: true, paidAmountCents: true, status: true }
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      select: { payerName: true, grossAmountCents: true, feeAmountCents: true, status: true, note: true }
    });

    const totalInvoicedCents = invoices.reduce((sum, inv) => sum + inv.totalAmountCents, 0);
    const totalPaidCents = invoices.reduce((sum, inv) => sum + inv.paidAmountCents, 0);
    const totalFeesCents = transactions.reduce((sum, tx) => sum + tx.feeAmountCents, 0);
    const unreconciledCount = transactions.filter(t => t.status === 'UNRECONCILED').length;

    let answer;
    try {
      answer = await askCopilot(trimmedQuestion, {
        invoices,
        transactions,
        stats: { totalInvoicedCents, totalPaidCents, totalFeesCents, unreconciledCount }
      });
    } catch (aiErr) {
      answer = 'AI Error: ' + (aiErr.message || 'Unable to contact AI provider');
    }

    // 2. Record assistant response in their chat history
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        role: 'assistant',
        text: answer
      }
    });

    res.json({
      answer,
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error('Copilot Chat Error:', error);
    res.status(500).json({ error: error.message || 'Copilot query failed.' });
  }
});

// Start Server
// NOTE: Express 5 also calls the app.listen() callback on 'error', so the
// success message must be tied to the real 'listening' event. Otherwise a
// failed bind (EADDRINUSE) would still print "Backend active".
const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`🚀 PayClear Backend active on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   The PayClear backend is probably already running.');
    console.error('   Stop the other instance (or run stop-payclear.ps1), then try again.');
    console.error('   To use a different port, change PORT in backend/.env.');
    process.exit(1);
  }
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Keep the process alive and log unexpected failures instead of dying silently
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});
