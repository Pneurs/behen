export type QA = { q: string; keys: string[]; a: string };

export const FAQ: QA[] = [
  { q: "How do I list my dress?", keys: ["list", "upload", "post", "sell", "add dress", "list my dress"], a: "Tap \"List your dress\" and follow the 6 easy steps: photos, details, price, instructions, location and a short video. Full guide: behen.pk/how-to-sell" },
  { q: "Is listing free?", keys: ["free", "listing fee", "cost to list", "charges"], a: "Listing is currently free for sellers." },
  { q: "How do I buy or rent a dress?", keys: ["buy", "rent", "order", "purchase", "book"], a: "Open Browse, pick a dress, then use credits to see the seller's contact and talk to her directly." },
  { q: "What are credits?", keys: ["credit", "credits", "contact", "number"], a: "Credits unlock a seller's phone and email. 3 credits = PKR 300, 5 credits = PKR 450. Pay by bank transfer and upload the screenshot with the transaction ID." },
  { q: "How do I pay?", keys: ["pay", "payment", "bank", "transfer", "ubl"], a: "Bank transfer only: UBL, title Behen.Pk, account 0611359113165. Upload the screenshot and transaction ID — credits are added after verification." },
  { q: "Who holds the security deposit?", keys: ["security", "deposit", "cnic", "damage", "responsible"], a: "The seller takes the security directly from the renter (up to the dress's full price). Behen.pk is only a connector and does not hold deposits or take responsibility for dresses." },
  { q: "How long does my listing stay live?", keys: ["expire", "expires", "expired", "expiry", "how long", "stay live", "live", "15 days", "inactive", "reactivate", "hidden", "permanent", "removed"], a: "Your listing stays live permanently until you delete it or mark it sold from My Dresses." },
  { q: "How do I verify WhatsApp?", keys: ["verify", "whatsapp", "verification"], a: "Go to your profile and tap Verify WhatsApp — it sends a message automatically, no code needed." },
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word match so "list" doesn't fire inside "listing".
const hasKey = (t: string, k: string) => new RegExp(`\\b${escape(k)}\\b`).test(t);

export function findAnswer(text: string): QA | null {
  const t = normalize(text);
  if (!t) return null;
  // Suggested chips (or the exact question typed) always get their own answer.
  const exact = FAQ.find((f) => normalize(f.q) === t);
  if (exact) return exact;
  let best: QA | null = null;
  let score = 0;
  for (const item of FAQ) {
    const s = item.keys.filter((k) => hasKey(t, k)).length;
    if (s > score) { score = s; best = item; }
  }
  return best;
}
