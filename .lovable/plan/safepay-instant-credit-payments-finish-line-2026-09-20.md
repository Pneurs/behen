# SafePay Instant Credit Payments — Finish Line

All the building work is already done and typechecked: the credits database is ready for instant payments, the two payment connections (checkout starter + payment confirmer) are live, the Credits page has a "Pay now — instant" button with automatic balance updates, and the admin order list shows SafePay vs Manual badges.

What's left is only **your SafePay account setup** — no more code changes unless a test fails.

## Where the three keys live (exact steps from SafePay's docs)

SafePay sandbox and live are **separate accounts** with separate keys. Start with sandbox (fake money, test cards); switch keys later when your live account is approved.

1. Log in to your SafePay dashboard:
   - Sandbox (test): the sandbox dashboard link from getsafepay.com
   - Live: https://getsafepay.com/dashboard
2. **Public API Key** (starts with `sec_`) and **Private API Secret Key**: click **Developers** (top-right of the navigation bar) → the API keys are items 1 and 2 on that page — click the copy icons.
3. **Webhook Secret Key**: in the left navigation click **Endpoints** → click **View shared secret** → use the eye/copy icon.
   - If no endpoint exists yet, click **+ Add an endpoint** and paste the webhook URL (step below), then select the payment events and Subscribe.

## The one URL to paste into SafePay

The payment confirmer's URL is shown in the **Backend view (Functions section)** of this project — copy the URL of `safepay-webhook` and paste it into SafePay → Developers → Endpoints. Then enable payment events (the 2.0.0 `payment.*` events) and Subscribe.

## Steps to finish (I'll do these with you)

1. Open the secure key form (I'll trigger it) and paste:
   - `SAFEPAY_MERCHANT_API_KEY` — the Public API Key (`sec_…`)
   - `SAFEPAY_SECRET_KEY` — the Private API Secret Key
   - `SAFEPAY_WEBHOOK_SECRET` — the Webhook Secret Key
2. I store the environment setting as `sandbox` so we test with fake money first.
3. You create the endpoint in SafePay's dashboard with the webhook URL from the Backend view and subscribe to payment events.
4. You make a test purchase on the Credits page using SafePay's test cards — credits should be added automatically within seconds, with no admin approval.
5. I re-test everything and check the payment logs.
6. Later, when Safepay approves your live account: paste the live keys into the same three secrets, and I flip the environment to `production`. (Note: rotating keys in SafePay makes old ones stop working immediately.)
