export type QA = { q: string; keys: string[]; a: string };

export const FAQ: QA[] = [
  { q: "How do I list my dress?", keys: ["list", "upload", "post", "sell", "add dress", "list my dress", "expire", "expiry", "how long", "permanent"], a: "Tap \"List your dress\" and follow the 6 easy steps: photos, details, price, instructions, location and a short video. Your listing stays live until you delete it or mark it sold. Full guide: behen.pk/how-to-sell" },
  { q: "Is listing free?", keys: ["free", "listing fee", "cost to list", "charges"], a: "Yes — listing your dress on Behen.pk is free." },
  { q: "How do I buy or rent a dress?", keys: ["buy", "rent", "order", "purchase", "book", "seller", "contact", "number"], a: "1) Open Browse and pick the dresses you like.\n2) Chat with the sellers for free — you can talk to more than one seller.\n3) Choose the right seller and agree on the price, dates and delivery option (pickup or courier) in chat.\n4) Accept the offer and pay your Behen.pk fee first by bank transfer (launch discount: 2.5% on sales, 4.25% on rentals). The seller then has 24 hours to pay hers — if she doesn't, your fee is refunded.\n5) Once your payment is verified, you get the seller's contact details to complete your deal." },
  { q: "How do I pay?", keys: ["pay", "payment", "bank", "transfer", "ubl", "fee"], a: "Bank transfer only: UBL, title Behen.Pk, account 0611359113165. After accepting an offer in chat, upload the payment screenshot and transaction ID there. We verify it and then share the seller's contact details." },
  { q: "Who holds the security deposit?", keys: ["security", "deposit", "cnic", "damage", "responsible"], a: "The seller takes the security directly from the renter (up to the dress's full price). Behen.pk is only a connector and does not hold deposits or take responsibility for dresses." },
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
