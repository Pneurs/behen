# Rebuild the product upload into six clear steps

## Upload flow

1. **Images**
   - Keep 1–3 main photos and add the line: “These images will be shown to non-registered users.”
   - Add a second uploader on the same step for up to 6 extra original photos, labelled as visible only to registered users.
   - Show separate previews and removal controls for public and registered-only photos.
   - Keep the AI-image option inside this first step when the super-admin enables it; when AI is off, the first main photo remains the cover.

2. **Details**
   - Move category, title, condition, description, fabric/details, size and fit, and included accessories here.
   - Preserve all existing detail fields and required-field rules.

3. **Pricing**
   - Move listing type, sale/rental prices, negotiation, and related pricing fields here.
   - For rentals, show the security deposit field followed by exactly:
     “You can take Choti Behen's ID card only, or ID card with security deposit. Behen.pk is only responsible to contact you both it's not our responsibility to check returned clothes and security returns”
   - Show the availability calendar on this step only when “For Rent” is selected.

4. **Instructions**
   - Move care instructions, rental cleaning/alteration instructions, and optional style tips here.

5. **Location & Delivery**
   - Move city, area, contact, pickup, drop-off, and all existing delivery-related fields here.
   - Keep exact-location privacy messaging and sale/rental conditional fields.

6. **Video**
   - Make the product video compulsory before publishing.
   - Let the seller either upload a video file directly or paste a supported public video link.
   - Show the final Publish Listing action only on this step.

## Navigation and validation

- Replace the current AI-oriented progress tracker with a six-step tracker: Images, Details, Pricing, Instructions, Location & Delivery, Video.
- Add Back/Continue controls and validate each step before advancing, so missing required information is shown where it belongs.
- Preserve edit mode, existing listing data, WhatsApp verification blocking, image-quality checks, and the success screen.
- Make the tracker and fields fit cleanly on mobile and desktop without changing the app’s existing visual style.

## Privacy and storage

- Separate public main photos from registered-only original photos in product data.
- Store registered-only photos in private storage and load them through authenticated, time-limited links; anonymous visitors will receive neither the files nor their URLs.
- Store directly uploaded listing videos privately and allow only the seller and authorized admins to retrieve them. Existing external video links remain supported.
- Preserve existing listings during the data change and avoid exposing their additional original photos to logged-out visitors.

## Technical details

- Add product fields for public photo references, private photo paths, and an optional uploaded-video path while retaining the existing external video URL.
- Add authenticated storage rules for private listing photos and videos, with owner/admin access where appropriate.
- Update product display queries so public cards/details use only public photos; registered users receive signed links for protected photos.
- Add client-side schema checks and database-level limits for photo counts, text lengths, and the requirement that each new listing has either an uploaded video or a valid video URL.
- Regenerate database types, run the project typecheck, and verify create/edit flows plus logged-out and logged-in product views in the browser on desktop and mobile.
