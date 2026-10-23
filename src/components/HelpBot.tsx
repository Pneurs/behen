import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircleQuestion, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWhatsAppBusinessNumber } from "@/hooks/useWhatsAppBusinessNumber";

type QA = { q: string; keys: string[]; a: string };

const FAQ: QA[] = [
  { q: "How do I list my dress?", keys: ["list", "upload", "post", "sell", "add dress"], a: "Tap \"List your dress\" and follow the 6 easy steps: photos, details, price, instructions, location and a short video. Full guide: behen.pk/how-to-sell" },
  { q: "Is listing free?", keys: ["free", "listing fee", "cost to list", "charges"], a: "Listing is currently free for sellers." },
  { q: "How do I buy or rent a dress?", keys: ["buy", "rent", "order", "purchase", "book"], a: "Open Browse, pick a dress, then use credits to see the seller's contact and talk to her directly." },
  { q: "What are credits?", keys: ["credit", "credits", "contact", "number"], a: "Credits unlock a seller's phone and email. 3 credits = PKR 300, 5 credits = PKR 450. Pay by bank transfer and upload the screenshot with the transaction ID." },
  { q: "How do I pay?", keys: ["pay", "payment", "bank", "transfer", "ubl"], a: "Bank transfer only: UBL, title Behen.Pk, account 0611359113165. Upload the screenshot and transaction ID — credits are added after verification." },
  { q: "Who holds the security deposit?", keys: ["security", "deposit", "cnic", "damage", "responsible"], a: "The seller takes the security directly from the renter (up to the dress's full price). Behen.pk is only a connector and does not hold deposits or take responsibility for dresses." },
  { q: "How long does my listing stay live?", keys: ["expire", "15 days", "inactive", "reactivate", "hidden"], a: "Listings stay live for 15 days. After that you can reactivate for free from My Dresses." },
  { q: "How do I verify WhatsApp?", keys: ["verify", "whatsapp", "verification"], a: "Go to your profile and tap Verify WhatsApp — it sends a message automatically, no code needed." },
];

const normalize = (s: string) => s.toLowerCase();

function findAnswer(text: string): QA | null {
  const t = normalize(text);
  let best: QA | null = null;
  let score = 0;
  for (const item of FAQ) {
    const s = item.keys.filter((k) => t.includes(k)).length;
    if (s > score) { score = s; best = item; }
  }
  return best;
}

type Msg = { from: "bot" | "user"; text: string; wa?: boolean };

export default function HelpBot() {
  const { pathname } = useLocation();
  const { businessNumber } = useWhatsAppBusinessNumber();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Assalam o Alaikum! How can I help you? Pick a question or type your own." },
  ]);

  if (pathname.startsWith("/admin")) return null;

  const waLink = businessNumber
    ? `https://wa.me/${businessNumber}?text=${encodeURIComponent("Hi Behen.pk, I need help")}`
    : null;

  const ask = (text: string) => {
    if (!text.trim()) return;
    const hit = findAnswer(text);
    setMsgs((m) => [
      ...m,
      { from: "user", text },
      hit
        ? { from: "bot", text: hit.a }
        : { from: "bot", text: "Sorry, I don't know that one yet. Our team will help you on WhatsApp.", wa: true },
    ]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-card text-card-foreground shadow-xl flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
            <span className="font-semibold">Behen.pk Help</span>
            <button aria-label="Close help" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "user" ? "text-right" : ""}>
                <div className={`inline-block rounded-xl px-3 py-2 max-w-[85%] text-left ${m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.text}
                  {m.wa && waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">
                      Chat with support on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-1 pt-1">
              {FAQ.map((f) => (
                <button key={f.q} onClick={() => ask(f.q)} className="rounded-full border px-2 py-1 text-xs hover:bg-muted">
                  {f.q}
                </button>
              ))}
            </div>
          </div>
          <form className="flex gap-2 p-3 border-t" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." />
            <Button type="submit" size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
      <button
        aria-label="Help"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>
    </>
  );
}
