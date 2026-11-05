// Blocks contact details in public listing text (title, description, style tips, etc.).
// Unlike chat, ordinary digits are allowed here (sizes, measurements, "worn 2 times").
// Keep in sync with public.listing_text_has_contact() in the database.

const URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const normalizeDigits = (text: string) =>
  text.replace(/[۰-۹٠-٩]/g, (ch) => {
    const u = URDU_DIGITS.indexOf(ch);
    return String(u >= 0 ? u : ARABIC_DIGITS.indexOf(ch));
  });

const NUMBER_WORDS =
  "(zero|one|two|three|four|five|six|seven|eight|nine|sifar|aik|ek|do|teen|tin|char|chaar|panch|paanch|chay|chhe|saat|aath|nau)";

const PATTERNS: { regex: RegExp; reason: string }[] = [
  // Pakistani mobile: 03xx xxxxxxx, +92 3xx..., 0092..., with spaces/dashes/dots
  { regex: /(\+|00)\s*9\s*2[\s.\-]*3(?:[\s.\-]*\d){9}/, reason: "phone number" },
  { regex: /\b0[\s.\-]*3(?:[\s.\-]*\d){9}\b/, reason: "phone number" },
  // Any run of 10+ digits (optionally separated) looks like a phone number
  { regex: /\d(?:[\s.\-]*\d){9,}/, reason: "phone number" },
  // Spelled-out digits: "zero three zero zero ..." (4+ in a row)
  { regex: new RegExp(`\\b${NUMBER_WORDS}(?:[\\s,.\\-]+${NUMBER_WORDS}){3,}\\b`, "i"), reason: "phone number" },
  // Email (including "name at gmail dot com")
  { regex: /[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\.[a-z]{2,}/i, reason: "email address" },
  { regex: /\b[a-z0-9._%+-]+\s*(\(at\)|\[at\]|\sat\s)\s*(gmail|yahoo|hotmail|outlook|icloud)\b/i, reason: "email address" },
  { regex: /\b(gmail|yahoo|hotmail|outlook|icloud)\s*(\.|dot)\s*com\b/i, reason: "email address" },
  // Messaging apps / social handles / links
  { regex: /\b(whats\s?app|watsapp|wtsapp|whtsapp|wp|telegram|viber)\b/i, reason: "messaging app" },
  { regex: /\b(instagram|insta|facebook|fb|tiktok|snapchat|twitter)\b/i, reason: "social media" },
  { regex: /(^|\s)@[a-z0-9._]{3,}/i, reason: "social media handle" },
  { regex: /\b(https?:\/\/|www\.)\S+/i, reason: "website link" },
  { regex: /\b[a-z0-9-]+\.(com|pk|net|org|me|link|ly)\b/i, reason: "website link" },
  // Contact phrases (English / Roman Urdu)
  {
    regex: /\b(call me|contact me|text me|message me|msg me|inbox me|dm me|my number|mera number|number do|number lo|call karo|call karein|fone karo|phone karo|rabta karo|rabta karein|contact karo|contact karein)\b/i,
    reason: "contact request",
  },
  // Urdu
  { regex: /نمبر|وٹس\s?ایپ|واٹس\s?ایپ|فون کر|کال کر|رابطہ کر|ای میل/, reason: "contact request" },
];

/** Returns the reason contact info was detected, or null when the text is clean. */
export const findListingContactInfo = (text: string | null | undefined): string | null => {
  if (!text) return null;
  // Mentioning our own site is fine.
  const normalized = normalizeDigits(text).replace(/\b(www\.)?behen\.pk\b/gi, " ");
  for (const { regex, reason } of PATTERNS) {
    if (regex.test(normalized)) return reason;
  }
  return null;
};

export const LISTING_CONTACT_ERROR =
  "Contact details (phone numbers, WhatsApp, email, social media or links) can't be added to your listing. Buyers will reach you safely through Behen.pk chat. / لسٹنگ میں فون نمبر، واٹس ایپ، ای میل یا سوشل میڈیا شامل نہیں کیا جا سکتا۔";

/** Public listing fields checked for contact info, with user-facing labels. */
export const LISTING_TEXT_FIELDS = [
  ["title", "Title"],
  ["description", "Description"],
  ["style_tips", "Style tips"],
  ["fabric", "Fabric"],
  ["color", "Color"],
  ["work_type", "Work type"],
  ["designer", "Designer"],
] as const;

/** Checks all public listing text fields; returns the first offending field label + reason. */
export const findContactInListing = (
  data: Partial<Record<(typeof LISTING_TEXT_FIELDS)[number][0], string | null | undefined>>,
): { field: string; label: string; reason: string } | null => {
  for (const [field, label] of LISTING_TEXT_FIELDS) {
    const reason = findListingContactInfo(data[field]);
    if (reason) return { field, label, reason };
  }
  return null;
};
