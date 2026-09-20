# Instant Credit Payments via SafePay

## Goal
Buyers pay for credits on the Credits page and receive them **instantly and automatically** — no admin approval step. SafePay (already the user's gateway) hosts the checkout (cards, bank accounts, mobile wallets including JazzCash/EasyPaisa), and its webhook confirms the payment server-side. The manual JazzCash/EasyPaisa flow stays as a fallback.

## How the new flow works (buyer's view)
1. Buyer picks a package (3 credits / PKR 300 or 5 / PKR 450) on `/credits`.
2. She taps **Pay now** → redirected to SafePay's secure checkout page.
3. She pays (card, bank, JazzCash, EasyPaisa — whatever SafePay shows).
4. She's sent back to `/credits`, where her balance updates automatically within seconds of payment completing.

## Setup steps (user's side)
- You (super admin) provide your SafePay secret key through the secure secret form. Two keys are needed: the merchant secret key and the webhook secret, both from the SafePay dashboard (sandbox first, then production keys once Safepay completes your live onboarding).
- We deploy the webhook endpoint first, then you register its URL in your SafePay dashboard (or we create it via the API) — one visit does both.

## Technical plan

### 1. Database (`lov_database--migration`, name: `safepay_credit_payments`)
- `ALTER TABLE public.credit_purchases ADD COLUMN provider text NOT NULL DEFAULT 'manual';`
- `ALTER TABLE public.credit_purchases ADD COLUMN safepay_tracker text;`
- Add `approved_by_user_id uuid` reference-style column is NOT needed — approval logic stays in existing RPCs.
- New SECURITY DEFINER function `complete_credit_purchase(_purchase_id uuid, _tracker text, _provider_reference text) -> jsonb`: atomically sets status = 'approved', records the provider reference, inserts a credit_transaction, and increments user_credits balance. Idempotent (no-op if already approved). Granted to `service_role` only. Never touch other schemas.

### 2. Edge function: `safepay-create-checkout`
- Called from Credits page with the user's JWT (validated in code; return 401 without it).
- Input: chosen package. **Server re-reads the package price/credits from `app_settings.credit_packages`** — client-supplied prices are never trusted.
- Inserts a `credit_purchases` row (status `pending`, `provider = 'safepay'`), then calls SafePay to create a payment tracker + auth token and builds the hosted checkout URL with the return redirect (`{origin}/credits?tracker=...`).
- Returns the checkout URL; the page redirects to it.
- Reads `SAFEPAY_SECRET_KEY` and `SAFEPAY_ENVIRONMENT` (sandbox/production) from secrets.

### 3. Edge function: `safepay-webhook`
- Public endpoint, no JWT; verifies SafePay's webhook signature using `SAFEPAY_WEBHOOK_SECRET` (timestamp + raw body HMAC, per SafePay docs) before doing anything.
- On `payment.completed`: find the pending purchase by tracker, call `complete_credit_purchase` via the service-role key. Idempotent — duplicate webhook deliveries change nothing.
- Returns 200 quickly; errors are logged for debugging.

### 4. Frontend — `src/pages/Credits.tsx`
- Each package gets a **Pay now** button → invoke `safepay-create-checkout` → `window.location.href` to the checkout URL.
- On return with `?tracker=...`: show a "Confirming your payment…" state and poll the buyer's purchases (already fetched) until status flips to `approved`, then toast "N credits added".
- Below the instant option, keep the existing manual JazzCash/EasyPaisa block, collapsed under "Or pay manually" — orders still go to admin approval.

### 5. Admin panel (`AdminDashboard` purchases list)
- Add a small provider badge (SafePay / Manual) on each order; SafePay orders approve themselves, so admins mainly watch manual ones.

### 6. Secrets & config
- Request `SAFEPAY_SECRET_KEY` and `SAFEPAY_WEBHOOK_SECRET` via the secure `add_secret` form (never in code) — requested **after** the webhook endpoint exists so the user gets the URL and keys configured in one pass.
- `SAFEPAY_ENVIRONMENT` starts as `sandbox` for testing, switched to `production` when live keys arrive.

### 7. Verification
- `bunx tsgo --noEmit` clean.
- End-to-end sandbox test with the Credits page against SafePay sandbox, confirming the webhook credits the balance and duplicate deliveries don't double-credit.

## Out of scope (later)
- Live (production) SafePay keys — user supplies once Safepay finishes live onboarding.
- Using credits to pay for rental/sale orders (currently credits only unlock seller contacts).
