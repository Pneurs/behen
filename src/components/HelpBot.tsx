import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircleQuestion, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWhatsAppBusinessNumber } from "@/hooks/useWhatsAppBusinessNumber";

import { FAQ, findAnswer } from "@/lib/helpBotFaq";

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
