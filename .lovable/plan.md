# SEO overhaul + 6 fixes

## Part A — Quick fixes

1. **Top menu missing on the listing page** — show the normal site header on the "List a dress" page (all 6 steps and the success screen), on phone and computer.
2. **Seller phone after unlocking** — once a buyer has spent credits (or already unlocked that listing), "Show Contact Details" shows the seller's name, WhatsApp-verified badge and phone number, with tap-to-call and a WhatsApp button. Right now the phone can come back empty because seller details are loaded with privacy limits. The fix is to return the phone only after a successful unlock.
3. **Extra photos for signed-in users** — on the product page, signed-in buyers see the main photos plus the up-to-6 private photos in the gallery. Older listings that stored photos the old way are included too.
4. **Credit emails not arriving** — find out why the "credits added" email isn't sending (it currently goes through a shared test sender that won't deliver to real customers). Fix: send from your own address (e.g. no-reply@behen.pk) using the app's built-in email sending, and trigger it from both automatic and manual approvals. Users also keep the in-app notification.
5. **Bank account on the Credits payment step** — add a "Bank Transfer" option next to JazzCash/EasyPaisa:
   UBL · Account title Behen.Pk · Account no. 0611359113165 (with a copy button).
6. **Security note** in the buy-credits section, under the packages:
   "Note: Credits are essential to see sellers' data for security purposes."

## Part B — SEO strategy

**Landing pages (programmatic, from real listings and your locations list)**
- Clean page addresses: `/rent/lahore`, `/rent/lahore/bridal-dresses`, `/rent/lahore/dha/bridal-dresses`, the same under `/buy/...`, plus category-only pages like `/bridal-dresses-on-rent`.
- Each page shows matching listings, a unique heading and intro (from your existing SEO content manager), an FAQ section, and links to nearby areas and cities.
- If a combination has no products yet, show the nearest broader page's listings so the page is never empty and never marked "noindex".

**On-page**
- A unique title and description on every page (home, browse, product, landing, static pages), plus canonical links and share previews.
- Product pages: the title uses dress name + category + city + "for Rent/Sale | Behen.pk".
- Structured data: Organization and WebSite (with search) on home; Product with price and availability on product pages; Breadcrumbs and FAQ on landing pages.
- Descriptive photo alt text, one main heading per page, and internal links (footer city/category links, "similar dresses").

**Technical**
- The sitemap includes every landing page and product with last-updated dates, and robots.txt stays open.
- Because the site renders in the browser, Google's view of each page needs meta tags per page. That means page-level head management plus making sure the sitemap's pages load quickly.
- Speed: image lazy-loading and sizes, preloading the main image on product pages.

**Content**
- A small "Guides" section (e.g. "Bridal dress on rent in Lahore — prices & tips") that links into the landing pages. It is built as a page type you can fill from the admin.

## Technical details
- Header: render `EnhancedHeader` in `ListDress.tsx`.
- Phone: extend the `unlock_contact` RPC (or add a `get_unlocked_contact(_product_id)` SECURITY DEFINER) that returns owner name/phone/verified only if a `contact_unlocks` row exists; `OwnerContactCard` uses it.
- Photos: ProductDetail signed URLs for `private_image_paths` plus legacy `real_images` when a session exists; check the storage read policy for authenticated users.
- Email: check the email domain status → set up sender infra + app email template "credits-added" → call it from the approve RPC paths (via an edge function, or a client call after approval/polling), using idempotency key `credits-<purchaseId>`.
- SEO: `react-helmet-async`, new routes in App.tsx mapped to Browse with params, JSON-LD components, update the sitemap edge function, add FAQ fields to `page_seo_content` (migration).
