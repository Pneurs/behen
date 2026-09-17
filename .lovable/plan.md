# WhatsApp Number Verification for Bari Behens (Free Flow)

## Goal
Verify sellers' phone numbers via WhatsApp at zero per-message cost. Sellers send a pre-filled WhatsApp message to the Behen.pk business number; admin confirms with one click; verified sellers get a public badge and can upload products.

## Flow

```text
Seller (Bari Behen)
  └─ Profile / first upload attempt → "Verify WhatsApp Number" step
  └─ App shows a unique 6-digit code + "Send via WhatsApp" button
  └─ Button opens wa.me/<business-number>?text=My Behen.pk code: 483920
  └─ Seller taps Send in WhatsApp (free — user-initiated message)

You (Admin)
  └─ Receive the code in WhatsApp Business app
  └─ Admin Dashboard → Verifications → enter/match code → Confirm (1 click)

Seller
  └─ Number marked verified → green "Verified" badge everywhere
  └─ Product upload unlocked
```

## Changes

### 1. Database
- `profiles` table: add `phone_verified boolean default false`, `phone_verification_code text`, `phone_verification_sent_at timestamptz`
- RLS: sellers can read their own verification fields; only admins/super_admin can set `phone_verified = true`

### 2. Verification UI (new component `PhoneVerificationCard`)
- Shown on Profile page (and popped up when a Bari Behen tries her first product upload without verification)
- Shows the seller's phone number, generates a 6-digit code (saved to profile), and a big green "Verify on WhatsApp" button (wa.me link with pre-filled code)
- Status states: Unverified → Code sent, awaiting confirmation → Verified (green check)
- "Resend code" regenerates the code

### 3. Admin Dashboard — Verifications tab
- List of sellers with pending codes (name, phone, code, when sent)
- One-click "Confirm Verified" button (admin matches the code they received in WhatsApp)
- Option to revoke verification (e.g. if number changes)

### 4. Product upload gate (ListDress.tsx)
- Bari Behen with `phone_verified = false`: upload blocked, friendly message + link to verification step

### 5. Verified badge (public)
- Green check + "WhatsApp Verified" shown on: ProductDetail page (seller card / contact popup), owner info sections
- Only when `phone_verified = true`

### 6. Settings
- Business WhatsApp number (the number sellers message) stored in `app_settings` as `whatsapp_business_number`, editable by super admin in Settings tab

## Cost
- **PKR 0 per verification** — the seller initiates the WhatsApp conversation; no templates, no Meta fees.
- Requires: your WhatsApp Business number connected (WhatsApp connector setup, one-time, free).

## Future upgrade (optional, later)
Fully automatic verification (code sent to seller, auto-checked) using WhatsApp Authentication templates — ~PKR 2–5 per code — if volume makes manual confirmation tedious.

## Technical notes
- No new secrets needed for the free flow (wa.me deep link only)
- `phone_verified` reset to false automatically if seller edits their phone number in Profile
