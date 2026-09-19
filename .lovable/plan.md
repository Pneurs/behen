# Fix: WhatsApp verification link not visible in Settings

## Problem
The verification link only appears in Admin → Settings → WhatsApp Verification **after** a token is created — and the token is only generated inside the Save button handler. The database currently has the WhatsApp number saved but **no** `whatsapp_verify_link_token` row, so the link/greeting section never renders.

## Fix
Update `src/components/admin/WhatsAppSettings.tsx`:

1. **Auto-create the token if missing** — when the settings card loads and no `whatsapp_verify_link_token` exists, generate one and save it (no button press needed).
2. **Always show the link section** once a token exists, independent of whether the number was just typed or previously saved.
3. Keep the existing "Create New Link" (regenerate) and copy buttons unchanged.

No database changes needed — the `get_my_verification_code` function and `/verify-whatsapp` page already exist and work.

## Technical details
- On load, if `token` is empty after fetching: generate `Math.random()...` token and upsert `{ key: "whatsapp_verify_link_token", value: { token } }` into `app_settings`, then set state.
- Remove the coupling where the token is only created in `handleSave`.
- `handleSave` keeps upserting the number; token logic simplified (reuse existing token).

## After the fix
Super admin opens Settings → WhatsApp Verification and immediately sees the verification link (`https://behen.pk/verify-whatsapp?t=...`) and the ready-to-paste greeting message.
