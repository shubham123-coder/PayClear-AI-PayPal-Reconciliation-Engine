// backend/src/services/aiService.js
// Provider-agnostic AI helper for PayClear.
// Primary provider: OpenRouter (free models by default).
// Optional fallback: Google Gemini, only if GEMINI_API_KEY is configured.
//
// Accuracy note: all money computations happen in integer cents in this
// codebase. Prompts only ask the model to EXPLAIN figures we pass in, never
// to calculate them, and temperature stays low for deterministic wording.

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const FALLBACK_OPENROUTER_MODEL = 'openrouter/free';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

function hasOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;
  return Boolean(key && key.trim() !== '' && !key.includes('your_openrouter'));
}

function hasGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && !key.includes('your_gemini_api_key_here'));
}

function hasAnyAiKey() {
  return hasOpenRouterKey() || hasGeminiKey();
}

/**
 * Primary provider: OpenRouter (OpenAI-compatible API).
 * Free model IDs end in ":free" and cost $0 per token (rate-limited).
 */
async function callOpenRouter(prompt, model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL) {
  if (!hasOpenRouterKey()) {
    console.warn('⚠️ [AI] OPENROUTER_API_KEY is missing or placeholder in backend/.env');
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
    'Content-Type': 'application/json',
    // Optional headers recommended by OpenRouter for app attribution
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
    'X-Title': 'PayClear'
  };

  const basePayload = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Friendly, natural conversational tone
    // Generous headroom: reasoning models can spend tokens on hidden
    // reasoning before writing the answer, otherwise content comes back empty.
    max_tokens: 4000
  };

  async function post(payload) {
    return fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  // Cap hidden reasoning so the visible answer always gets written; retry
  // without the parameter if a provider rejects it with a 400.
  const reasoningOptions = { effort: 'low', max_tokens: 800 };

  let response = await post({ ...basePayload, reasoning: reasoningOptions });
  if (response.status === 400) {
    response = await post(basePayload);
  }

  // Free endpoints can be momentarily rate-limited — retry once.
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await post({ ...basePayload, reasoning: reasoningOptions });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [AI/OpenRouter Error ${response.status}] (${model}):`, errorText);
    throw new Error(`AI provider returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim() || null;

  if (!text) {
    console.warn(
      `⚠️ [AI] ${model} returned empty content (finish_reason: ${choice?.finish_reason || 'unknown'}).`
    );
  }

  return text;
}

/**
 * Optional fallback provider: Google Gemini (only used when configured).
 */
async function callGemini(prompt) {
  if (!hasGeminiKey()) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [AI/Gemini Error ${response.status}]:`, errorText);
    throw new Error(`AI provider returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

/**
 * Calls OpenRouter first, then the optional Gemini fallback.
 * Returns null when no provider is configured so callers can use their
 * deterministic fallback text.
 */
async function callLLM(prompt) {
  let lastError = null;

  if (hasOpenRouterKey()) {
    const models = [
      process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      FALLBACK_OPENROUTER_MODEL
    ];

    for (const model of [...new Set(models)]) {
      try {
        const text = await callOpenRouter(prompt, model);
        if (text) return text;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [AI] ${model} failed:`, err.message);
      }
    }
  }

  if (hasGeminiKey()) {
    try {
      const text = await callGemini(prompt);
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.warn('⚠️ [AI] fallback provider failed:', err.message);
    }
  }

  // Surface the real reason so callers can show an actionable message
  if (lastError) throw lastError;
  return null;
}

/**
 * 1. Explains why an invoice and PayPal transaction matched
 */
async function explainMatchDiscrepancy(invoice, transaction, matchType) {
  const invTotal = (invoice.totalAmountCents / 100).toFixed(2);
  const txGross = (transaction.grossAmountCents / 100).toFixed(2);
  const txFee = (transaction.feeAmountCents / 100).toFixed(2);
  const txNet = (transaction.netAmountCents / 100).toFixed(2);

  const fallback = `Matched based on ${matchType.replace(/_/g, ' ')}. PayPal deducted $${txFee} in processing fees. Net received: $${txNet}.`;

  const prompt = `
You are PayClear, a concise financial reconciliation AI for freelancers.
Explain this PayPal match in 2 crisp, plain-English sentences:

- Invoice: #${invoice.invoiceNumber} billed for $${invTotal} to ${invoice.customerName}
- PayPal Transaction: Received $${txGross} gross from ${transaction.payerName}
- PayPal Processing Fee: $${txFee}
- Net Deposited: $${txNet}
- Match Reason: ${matchType}
- Transaction Note: "${transaction.note || 'None'}"

Reproduce the dollar figures exactly as given above — do NOT recalculate them.
Explain clearly that the difference between the invoice and the deposit is PayPal's processing fee. Keep it under 40 words.
`;

  try {
    const aiText = await callLLM(prompt);
    return aiText || fallback;
  } catch (err) {
    console.warn('Using fallback explanation due to AI error:', err.message);
    return fallback;
  }
}

/**
 * 2. Drafts a friendly, professional email reminder for overdue/unpaid invoices
 */
async function draftInvoiceReminder(invoice) {
  const total = (invoice.totalAmountCents / 100).toFixed(2);
  const remaining = ((invoice.totalAmountCents - invoice.paidAmountCents) / 100).toFixed(2);

  const fallback = `Subject: Friendly Reminder: Invoice #${invoice.invoiceNumber} Due\n\nHi ${invoice.customerName},\n\nJust following up on invoice #${invoice.invoiceNumber} for $${remaining}. Please let me know when payment is processed.\n\nThank you!`;

  const prompt = `
Write a friendly, professional 3-sentence email reminder from a freelancer to a client.
Client: ${invoice.customerName}
Invoice: #${invoice.invoiceNumber}
Total Amount: $${total}
Remaining Balance Due: $${remaining}
Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}

Use the dollar amounts exactly as written above — do NOT recalculate them.
Output ONLY the email subject and body. No greetings to me, no meta-chatter.
`;

  try {
    const aiText = await callLLM(prompt);
    return aiText || fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * 3. Live AI Copilot: Guides users on how to use PayClear AND answers ledger questions
 */
async function askCopilot(userQuestion, contextData) {
  if (!hasAnyAiKey()) {
    return "Copilot setup needed: add an OPENROUTER_API_KEY or GEMINI_API_KEY to backend/.env and restart the backend.";
  }

  const prompt = `
You are PayClear Copilot, a warm, intelligent, and helpful financial assistant for freelancers using the PayClear platform.

--- ABOUT PAYCLEAR & APP WORKFLOW (FOR USER ONBOARDING & HELP) ---
- Problem PayClear Solves: When clients pay an invoice via PayPal, PayPal deducts processing fees (e.g. 3.49% + $0.49). If an invoice is for $1,200, the fee is $42.37 and the bank deposit is $1,157.63. Traditional accounting software fails to match them, leaving invoices unpaid. PayClear connects the dots.
- Core Workflow:
  1. Invoices: Create invoices using "+ New Invoice" or test with the "1-Click Scenarios" button.
  2. PayPal Bank Feed: Incoming payments appear in the bank feed as UNRECONCILED.
  3. Run AI Reconciliation: Click "⚡ Run AI Reconciliation". PayClear compares invoices and deposits, accounts for fees, and displays matches in the "AI Suggested Match Queue".
  4. Confirm Match: Review the plain-English explanation and click "✓ Confirm Match" to mark the invoice as PAID.
  5. Profit Guard: Monitors total processing fee deductions and gives actionable advice to reduce fee leakage.
  6. Audit Trail: Click "📥 Audit Trail (CSV)" for an exportable reconciliation ledger (audit-trail CSV).
  7. Client Reminders: Click "Draft Reminder" on unpaid invoices to have AI draft a polite follow-up email.

--- REAL-TIME USER LEDGER CONTEXT ---
Active Invoices:
${JSON.stringify(contextData.invoices, null, 2)}

Recent PayPal Transactions:
${JSON.stringify(contextData.transactions, null, 2)}

Summary Stats:
- Total Invoiced: $${(contextData.stats.totalInvoicedCents / 100).toFixed(2)}
- Total Received: $${(contextData.stats.totalPaidCents / 100).toFixed(2)}
- Total Fees Deducted: $${(contextData.stats.totalFeesCents / 100).toFixed(2)}
- Unreconciled Transactions: ${contextData.stats.unreconciledCount}
------------------------------------

User Question: "${userQuestion}"

Instructions:
- If the user asks how to use the app, what PayClear does, or for general assistance: explain warmly and conversationally in 2-4 easy-to-follow sentences or short bullet points. Be encouraging and clear.
- If the user asks specific questions about their ledger (e.g. "Who owes me?", "How much did I lose in fees?", "What's unpaid?"): cite the exact client names, dollar amounts, and invoice numbers from the context above.
- Never use robotic phrases like "Based strictly on the JSON provided". Talk like an experienced financial copilot speaking directly to a freelancer.
`;

  try {
    const aiText = await callLLM(prompt);
    return aiText || "I analyzed your ledger but could not generate a response. Please try again.";
  } catch (err) {
    if (/429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(err.message || '')) {
      return "The AI provider's free quota is temporarily busy. Please try again in a few moments, or check your backend/.env key.";
    }
    return `AI Error: ${err.message}. Please check your backend terminal for details.`;
  }
}

/**
 * 4. Per-invoice AI info: status summary, payment health and suggested next step
 */
async function explainInvoice(invoice, context = {}) {
  const total = (invoice.totalAmountCents / 100).toFixed(2);
  const paid = (invoice.paidAmountCents / 100).toFixed(2);
  const remaining = ((invoice.totalAmountCents - invoice.paidAmountCents) / 100).toFixed(2);
  const daysOverdue = invoice.dueDate
    ? Math.max(0, Math.floor((Date.now() - new Date(invoice.dueDate)) / 86400000))
    : 0;

  const fallback = `Invoice #${invoice.invoiceNumber} for ${invoice.customerName} is ${invoice.status.replace(/_/g, ' ').toLowerCase()} — $${total} billed, $${paid} received, $${remaining} outstanding.${context.confirmedMatchCount > 0 ? ` ${context.confirmedMatchCount} payment(s) have been bank-reconciled against it.` : ''}${invoice.dueDate && daysOverdue > 0 && invoice.status !== 'PAID' ? ` It is ${daysOverdue} day(s) past its due date, so sending a reminder is recommended.` : ''}`;

  const prompt = `
You are PayClear, a concise financial AI for freelancers. Summarize this invoice
in 3 short plain-English sentences: current state, payment progress, and the one
next action the freelancer should take now.

- Invoice: #${invoice.invoiceNumber} to ${invoice.customerName} (${invoice.customerEmail})
- Amount billed: $${total}
- Already paid: $${paid}
- Outstanding: $${remaining}
- Status: ${invoice.status}
- Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'upon receipt'}${invoice.dueDate && daysOverdue > 0 ? ` (${daysOverdue} day(s) overdue)` : ''}
- Issued: ${new Date(invoice.createdAt).toLocaleDateString()}
- Payments bank-reconciled against it: ${context.confirmedMatchCount ?? 0}
- Suggested matches awaiting approval: ${context.suggestedMatchCount ?? 0}
- PayPal reference: ${invoice.paypalInvoiceId || 'none'}

Use the dollar amounts exactly as written above — do NOT recalculate them.
Be concrete with dollar amounts and status. Under 60 words total.
`;

  try {
    const aiText = await callLLM(prompt);
    return aiText || fallback;
  } catch (err) {
    console.warn('Using fallback invoice explanation due to AI error:', err.message);
    return fallback;
  }
}

module.exports = {
  explainMatchDiscrepancy,
  draftInvoiceReminder,
  explainInvoice,
  askCopilot
};
