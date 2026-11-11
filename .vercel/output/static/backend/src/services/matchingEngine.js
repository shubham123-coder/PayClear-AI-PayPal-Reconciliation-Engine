// backend/src/services/matchingEngine.js

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pure matching engine (no DB side effects).
 * Compares unpaid invoices against unreconciled transactions and returns
 * ranked match candidates. Used by server.js reconciliation endpoint.
 */
function findMatches(invoices, transactions) {
  const matches = [];

  for (const invoice of invoices) {
    const remainingBalanceCents = invoice.totalAmountCents - invoice.paidAmountCents;

    // Whole-token reference (prevents invoice "1" matching "INV-2025-001").
    // Short numeric numbers ("1", "42") must appear after an explicit
    // invoice marker (e.g. "Invoice #1") to avoid matching phrases like
    // "Milestone 1 Deposit".
    const invoiceRef = String(invoice.invoiceNumber || '').trim();
    const isShortNumericRef = /^\d{1,2}$/.test(invoiceRef);
    const referencePattern = !invoiceRef
      ? null
      : isShortNumericRef
      ? new RegExp(`(invoice|inv|ref|payment for)\\s*#?\\s*${escapeRegex(invoiceRef)}($|[^0-9])`, 'i')
      : new RegExp(`(^|[^a-z0-9])${escapeRegex(invoiceRef)}($|[^a-z0-9])`, 'i');

    for (const tx of transactions) {
      let matchType = null;
      let confidenceScore = 0.0;

      // -------------------------------------------------------------
      // RULE 1: Direct Invoice Reference
      // Does transaction note contain the invoice number as a whole token?
      // -------------------------------------------------------------
      if (referencePattern && tx.note && referencePattern.test(tx.note)) {
        matchType = 'EXACT_REFERENCE';
        confidenceScore = 0.99;
      }
      // -------------------------------------------------------------
      // RULE 2: Exact Email & Exact Amount
      // -------------------------------------------------------------
      else if (
        tx.payerEmail &&
        invoice.customerEmail &&
        tx.payerEmail.toLowerCase() === invoice.customerEmail.toLowerCase() &&
        tx.grossAmountCents === remainingBalanceCents
      ) {
        matchType = 'EXACT_EMAIL_AND_AMOUNT';
        confidenceScore = 0.95;
      }
      // -------------------------------------------------------------
      // RULE 3: Exact Name & Full Amount
      // Customer paid full amount by name; PayPal fee explains any gap
      // -------------------------------------------------------------
      else if (
        tx.payerName &&
        invoice.customerName &&
        tx.payerName.toLowerCase() === invoice.customerName.toLowerCase() &&
        tx.grossAmountCents === remainingBalanceCents
      ) {
        matchType = 'FEE_ADJUSTED';
        confidenceScore = 0.90;
      }
      // -------------------------------------------------------------
      // RULE 4: Partial Payment
      // Same email or name, but amount is less than total owed
      // -------------------------------------------------------------
      else if (
        (tx.payerEmail?.toLowerCase() === invoice.customerEmail?.toLowerCase() ||
         tx.payerName?.toLowerCase() === invoice.customerName?.toLowerCase()) &&
        tx.grossAmountCents < remainingBalanceCents
      ) {
        matchType = 'PARTIAL_PAYMENT';
        confidenceScore = 0.75;
      }

      if (matchType) {
        matches.push({ invoice, transaction: tx, matchType, confidenceScore });
      }
    }
  }

  // Highest confidence first
  return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Standalone reconciliation runner (outside the HTTP layer).
 * Fetches data, runs the engine, asks Gemini for explanations,
 * and persists SUGGESTED matches (skipping duplicates).
 */
async function runReconciliation() {
  const { PrismaClient } = require('@prisma/client');
  const { explainMatchDiscrepancy } = require('./aiService');

  const prisma = new PrismaClient();

  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } }
    });
    const unreconciledTransactions = await prisma.transaction.findMany({
      where: { status: 'UNRECONCILED' }
    });

    console.log(`\n🔍 Running Reconciliation Engine...`);
    console.log(`Analyzing ${unpaidInvoices.length} unpaid invoices against ${unreconciledTransactions.length} transactions.`);

    const suggestions = [];

    for (const match of findMatches(unpaidInvoices, unreconciledTransactions)) {
      const existing = await prisma.reconciliationMatch.findFirst({
        where: { invoiceId: match.invoice.id, transactionId: match.transaction.id }
      });
      if (existing) continue;

      console.log(`Found candidate match [${match.matchType}] between Invoice ${match.invoice.invoiceNumber} and Tx ${match.transaction.paypalTransactionId}`);

      const aiExplanation = await explainMatchDiscrepancy(
        match.invoice,
        match.transaction,
        match.matchType
      );

      const matchRecord = await prisma.reconciliationMatch.create({
        data: {
          invoiceId: match.invoice.id,
          transactionId: match.transaction.id,
          matchType: match.matchType,
          confidenceScore: match.confidenceScore,
          aiExplanation,
          status: 'SUGGESTED'
        },
        include: { invoice: true, transaction: true }
      });

      suggestions.push(matchRecord);
    }

    return suggestions;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  findMatches,
  runReconciliation
};
