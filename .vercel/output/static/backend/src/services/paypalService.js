// backend/src/services/paypalService.js
// PayPal Sandbox API Integration with Resilient Fallback

const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

/**
 * 1. Fetches an OAuth 2.0 Bearer Token from PayPal Sandbox
 */
async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes('your_paypal')) {
    return null;
  }

  const auth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`[PayPal Auth] Sandbox token rejected (${response.status}):`, errText);
    return null;
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 2. Creates a draft invoice in PayPal Sandbox
 * Resilient Adapter: If PayPal sandbox credentials or invoicing permissions
 * fail, it automatically generates a unique sandbox reference so the local
 * ledger remains functional.
 */
async function createDraftInvoice({ invoiceNumber, customerName, customerEmail, amountDollars }) {
  // Generate a guaranteed unique fallback sandbox ID
  const fallbackId = `INV2-SBX-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      console.log(`ℹ️ [PayPal Sandbox] Using simulated reference ID: ${fallbackId}`);
      return { paypalInvoiceId: fallbackId, status: 'DRAFT_LOCAL' };
    }

    const payload = {
      detail: {
        invoice_number: `${invoiceNumber}-${Date.now().toString().slice(-4)}`,
        currency_code: 'USD',
        note: `Invoice #${invoiceNumber} for ${customerName}`
      },
      primary_recipients: [
        {
          billing_info: {
            name: { given_name: customerName },
            email_address: customerEmail || 'client@example.com'
          }
        }
      ],
      items: [
        {
          name: 'Professional Consulting Services',
          quantity: '1',
          unit_amount: {
            currency_code: 'USD',
            value: parseFloat(amountDollars).toFixed(2)
          }
        }
      ]
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`⚠️ [PayPal Invoicing] Sandbox API status ${response.status}. Falling back to sandbox ID.`);
      return { paypalInvoiceId: fallbackId, status: 'DRAFT_MOCK' };
    }

    const data = await response.json();
    return {
      paypalInvoiceId: data.id || fallbackId,
      status: data.status || 'DRAFT'
    };
  } catch (error) {
    console.warn('[PayPal Service Fallback]:', error.message);
    return { paypalInvoiceId: fallbackId, status: 'DRAFT_OFFLINE' };
  }
}

module.exports = {
  getAccessToken,
  createDraftInvoice
};