```markdown
# PayClear | AI PayPal Reconciliation Engine

> **Deterministic payment matching, fee transparency, and natural-language financial explanations for independent businesses.**

Stop guessing which deposit paid which invoice. PayClear matches incoming payments against outstanding balances, accounts for gateway processing fee deductions, and turns messy bank feeds into an exportable, audit-ready reconciliation ledger.

---

## The Problem

Freelancers and small creative studios face a persistent bookkeeping challenge: **the amount invoiced to a client is rarely the exact amount that settles into their bank account or PayPal balance.**

Under standard commercial processing rates (illustratively 3.49% + $0.49 for US PayPal checkout):
- You issue an invoice for **$1,200.00**.
- The client pays the full **$1,200.00**.
- PayPal automatically deducts its commercial processing fee:
  $$\$1,200.00 \times 0.0349 = \$41.88 + \$0.49 = \$42.37$$
- The net proceeds deposited into your account are:
  $$\$1,200.00 - \$42.37 = \$1,157.63$$

When standard bookkeeping tools look strictly for an incoming deposit of **$1,200.00**, the match fails. The invoice sits open as "unpaid," while an unallocated **$1,157.63** deposit floats in the bank feed.

PayClear bridges this gap by separating **payment recognition** from **settlement reconciliation**: matching the client's gross payment to the invoice while booking the gateway fee deduction as an explicit, tax-deductible operating expense.

---

## Key Features

- **Deterministic Gross vs. Net Reconciliation:** Compares gross payments against open invoice balances instead of trying to match net bank deposits directly.
- **4-Tier Heuristic Matching Cascade:**
  - *Rule 1 (0.99):* Whole-token invoice reference regex in transaction note.
  - *Rule 2 (0.95):* Exact customer email match where gross payment equals remaining balance.
  - *Rule 3 (0.90):* Exact customer name match where gross payment equals remaining balance.
  - *Rule 4 (0.75):* Verified entity identity where gross payment is less than the remaining balance (milestone payment).
- **Human-in-the-Loop Safeguards:** AI never alters financial records or marks payments as confirmed. Confirmations require a user click and run inside atomic database transactions (`prisma.$transaction`) with HTTP 409 conflict protections against double-processing.
- **Natural-Language AI Explanations:** Plain-English discrepancy summaries, per-invoice health overviews, and draft client follow-ups.
- **1-Click Scenario Simulator:** Pre-loads realistic edge cases (standard fee deductions, partial milestone payments, and corporate parent name mismatches) with zero manual database setup.
- **Profit Guard Analytics:** Visualizes cumulative processing fee leakage and provides actionable payment method recommendations.
- **Audit-Ready CSV Export:** One-click download of verified reconciled transactions, fee breakdowns, and invoice mappings.

---

## How We Used PayPal & AI

### 1. PayPal Developer Platform (Sandbox Integration)
PayClear interacts with the official **PayPal Sandbox REST environment** (`https://api-m.sandbox.paypal.com`):
- **OAuth 2.0 Authentication (`POST /v1/oauth2/token`):** Exchanges Sandbox `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` via HTTP Basic authentication for secure Bearer access tokens.
- **Invoicing v2 REST API (`POST /v2/invoicing/invoices`):** Generates structured draft commercial invoices directly in PayPal's sandbox system, including customer email, invoice numbers, line items, and totals.
- **Resilient Sandbox Adapter:** When working with personal developer test accounts that lack merchant invoicing permissions (returning HTTP `403 NOT_AUTHORIZED`), our adapter in `backend/src/services/paypalService.js` safely catches the error and provides a structured local simulation reference (`INV2-SBX-XXXXXX`). This ensures testing and UI flows remain unblocked during sandbox permission constraints.

*(Note: To bypass PayPal's sandbox transaction reporting indexing delay—which can take 30 minutes to 3 hours in sandbox—incoming deposits in this prototype are loaded through our database and 1-Click Scenario Simulator, reflecting the exact data payload of a PayPal capture.)*

### 2. AI Architecture & Models
PayClear implements a provider-agnostic AI layer in `backend/src/services/aiService.js` with an automatic fallback chain:
- **Primary Provider (OpenRouter):** Powered by `nvidia/nemotron-3.5-super-vl:free`, with automatic retry fallback to `openrouter/free`.
- **Secondary Fallback (Google Gemini):** Configured via the `gemini-3.5-flash-lite` REST endpoint as an optional secondary provider if OpenRouter is unreachable or rate-limited.
- **The Core FinTech Guardrail:** **The LLM never performs financial arithmetic.** All fee calculations, balances, and rule comparisons run deterministically in Node.js using integer cents. The AI is used solely for presentation:
  1. *Match Explanations:* Translates precalculated numbers into clear summaries.
  2. *Reminder Drafting:* Generates polite client emails for overdue invoices.
  3. *Copilot Drawer:* Answers questions about live ledger context and provides product onboarding guidance.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19 (`^19.3.1`), Vite 8 (`^8.3.5`), Tailwind CSS (`^3.4.17`), Server-Sent Events (SSE) reader |
| **Backend** | Node.js, Express 5 (`^5.3.0`), Prisma ORM (`^5.22.0`), SQLite |
| **Auth & Security** | JWT (`jsonwebtoken`), `bcryptjs` password hashing, integer-cent arithmetic |
| **APIs & Services** | PayPal Sandbox REST API (OAuth 2.0, Invoicing v2), OpenRouter API (NVIDIA Nemotron), Google Gemini 3.5 Flash Lite REST API, Nodemailer |

---

## Architecture & Financial Precision

Computers struggle with binary floating-point arithmetic (e.g., `0.1 + 0.2 = 0.30000000000000004`). In PayClear:
1. **Integer Minor Units:** All monetary values are calculated and stored in integer cents (e.g., $1,200.00 is stored as `120000`).
2. **Deterministic Settlement Equation:**
   $$\text{Outstanding Balance} = \text{Original Invoice Amount} - \sum \text{Valid Applied Gross Payments}$$
3. **Atomic Confirmations:**
   When a match is approved, `prisma.$transaction` ensures that updating the match status, setting the transaction to `RECONCILED`, and reducing the invoice balance succeed or fail together atomically.

---

## Local Setup Instructions

Follow these steps to run PayClear locally on your machine:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (comes with Node)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/payclear.git
cd payclear
```

### 2. Configure the Backend
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory by copying the example:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use: `copy .env.example .env`)*

Open `backend/.env` and fill in your keys:
```ini
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secure-jwt-secret-here"

# PayPal Sandbox Credentials (from developer.paypal.com)
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"

# AI Provider Keys (at least one is recommended for AI summaries)
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_MODEL="nvidia/nemotron-3.5-super-vl:free"
GEMINI_API_KEY="your_gemini_api_key"
```

Initialize the SQLite database with Prisma migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend server:
```bash
npm run dev
```
The backend will start at `http://localhost:5000`.

---

### 3. Configure the Frontend
Open a new terminal window, navigate to the `frontend/` directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

## Testing the Application (Demo Mode)

You can test the entire workflow with zero manual data entry:

1. Open `http://localhost:5173` in your browser.
2. Click **"Demo Sign In"** on the login page (or use `demo@payclear.app` with password `demo1234`).
3. Click **"Load Scenarios"** in the top action bar:
   - **Scenario A:** Standard invoice with commercial fee deduction ($1,200 gross, $42.37 fee, $1,157.63 net).
   - **Scenario B:** 50% milestone partial payment ($1,750 on a $3,500 invoice).
   - **Scenario C:** Payer name mismatch (Nexus Holdings LLC paying for Nexus Labs).
4. Click **"⚡ Run AI Reconciliation"** to run the matching engine and generate plain-English explanations.
5. Review suggestions in the **Match Queue** and click **"Confirm Match"** to update balances atomically.
6. Open the **Profit Guard** panel to view processing fee leakage analytics.
7. Click **"Audit Trail (CSV)"** to export the verified reconciliation spreadsheet.
8. Open the **Copilot** drawer on the right to query your live ledger balance.

---

## Project Structure

```
payclear/
├── backend/
│   ├── prisma/
│   │   ├── migrations/         # Database migrations (includes simulation tracking)
│   │   └── schema.prisma       # Prisma data models (User, Invoice, Transaction, etc.)
│   ├── src/
│   │   ├── services/
│   │   │   ├── aiService.js        # OpenRouter (Nemotron) & Gemini 3.5 Flash Lite fallback
│   │   │   ├── emailService.js     # Nodemailer reminder engine
│   │   │   ├── matchingEngine.js   # 4-tier deterministic matching rules
│   │   │   └── paypalService.js    # PayPal OAuth 2.0 & Invoicing v2 adapter
│   │   └── server.js           # Express API endpoints & atomic transaction handlers
│   ├── .env.example            # Template for environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Modular UI (MatchQueue, LedgerTables, CopilotDrawer, etc.)
│   │   ├── api.js              # Centralized API client & SSE stream consumer
│   │   ├── App.jsx             # Main dashboard shell & theme provider
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## Future Roadmap

1. **Live PayPal Webhook Ingestion:** Ingest real-time `PAYMENT.CAPTURE.COMPLETED` notifications with HMAC-SHA256 signature verification.
2. **Historical CSV Statement Ingestion:** Direct parser for past PayPal transaction exports to bypass sandbox indexing latency.
3. **Multi-Gateway Reconciliation:** Extend heuristic matching to Stripe, Wise, and bank feeds.
4. **Automated Regional Fee Schedules:** Dynamic detection of international cross-border rates vs. domestic processing schedules.

---

## License

MIT License. Built for the 2026 PayPal AI Hackathon.
```
