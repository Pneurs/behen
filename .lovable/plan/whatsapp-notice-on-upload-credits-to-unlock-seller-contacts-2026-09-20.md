# WhatsApp notice on upload + Credits to unlock seller contacts

## 1. WhatsApp warning above product upload

On the product upload page, show a clear warning banner at the top when the seller's WhatsApp number is not yet verified: "Your WhatsApp number isn't verified yet. Verify it to publish your product." with a button that goes to the verification card. The existing block on publishing stays as it is; this just makes the reason visible before she fills the whole form.

## 2. Credit system for seller contact details

How it works for a buyer:

- Seller contact details on a listing are locked behind credits. No free credits for new buyers.
- Unlocking costs 1 credit and unlocks that one listing permanently — reopening the same listing later is free.
- With 0 credits, the "Show Contact Details" button opens a buy-credits screen instead.

Packages (editable by you later):

- 3 credits — PKR 300
- 5 credits — PKR 450 (best value)

### The payment step needs a decision

You asked for instant credits with no manual approval. That requires an online card payment gateway. Lovable has built-in payments (Stripe), but the seller account country must be supported, and Pakistan is not currently on that list — so card checkout may not be available for a Pakistan-registered business. JazzCash/EasyPaisa are not built-in either; they would need their own merchant account and a custom integration.

So I will build it in two parts:

- **Part A (now):** the whole credit system — balances, locking, spending, unlock history, admin controls — plus a purchase screen that records the order.
- **Part B:** the actual instant payment. Options, once you tell me which you want:
  1. Try built-in card checkout (I check whether your country is supported; if yes, credits land instantly, fully automatic).
  2. Your own JazzCash/EasyPaisa merchant account — instant too, but you must apply for merchant API access with them and give me the keys.
  3. Interim: buyer sends payment and uploads the screenshot, you tap approve in admin (not automatic, but works today).

Until Part B is picked, purchases land in an admin list where you approve them, and you can also add credits to anyone by hand.

## 3. Admin controls (Settings tab)

- On/off toggle for the whole credit system. When off, contact details behave exactly as they do today.
- Editable: credits charged per unlock, free credits given on signup (default 0), and the two packages (credit count and price each).
- New admin list of credit purchases with approve/reject, and a way to add credits to a buyer manually.

## Technical notes

- New tables: `user_credits` (balance per user), `credit_transactions` (grants, spends, purchases), `contact_unlocks` (user_id + product_id, unique), `credit_purchases` (package, amount, status, proof). All with RLS scoped to `auth.uid()` plus admin policies via `has_role`, and GRANTs for `authenticated`/`service_role`.
- Spending is done by a `SECURITY DEFINER` function `unlock_contact(_product_id)` that checks balance, inserts the unlock, debits the balance and writes the transaction atomically — so a buyer cannot unlock without paying or be charged twice for the same listing.
- Settings stored in `app_settings` under `credit_system_enabled`, `credit_cost_per_unlock`, `credit_signup_grant`, `credit_packages`; read through a new `useCreditSettings` hook, mirroring the existing toggle hooks.
- `OwnerContactCard.tsx` gains three states: locked (shows cost + balance), unlocking, unlocked (current dialog). It queries `contact_unlocks` for the product first.
- New `/credits` page: balance, transaction history, package purchase.
- `ListDress.tsx` renders the unverified-WhatsApp banner from its existing `phoneVerified` state.
