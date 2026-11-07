import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Lock, FileText, Tag, ClipboardList, MapPin, Video, ShieldCheck } from "lucide-react";

import OwnDressNotice from "@/components/OwnDressNotice";

const steps = [
  { icon: Camera, title: "Main photos", urdu: "مین تصاویر", points: ["Use your own actual dress photos — not brand catalogs or website screenshots", "Front photo of the full dress in daylight", "Plain background, no faces needed", "These photos are visible to everyone"] },
  { icon: Lock, title: "Extra private photos", urdu: "اضافی تصاویر", points: ["Up to 5 close-ups: embroidery, back, dupatta", "Only signed-in buyers can see them", "Show any flaws honestly — builds trust"] },
  { icon: FileText, title: "Dress details", urdu: "تفصیلات", points: ["Category, size, colour and designer", "Mention if alterations are possible", "Don't write phone numbers — they get blocked"] },
  { icon: Tag, title: "Pricing", urdu: "قیمت", points: ["Choose Rent, Sell or both", "Add the original price so buyers see the discount", "Set rental price per day and security deposit", "For rentals you may take security up to the full dress value"] },
  { icon: ClipboardList, title: "Instructions", urdu: "ہدایات", points: ["Care and washing notes — for kids (under 12) advise gentle hand wash or steam, not chemical dry cleaning", "Return condition rules for renters", "Block dates when the dress isn't available"] },
  { icon: MapPin, title: "Location & delivery", urdu: "مقام اور ڈلیوری", points: ["Choose your city and area only", "Your exact address stays private", "Pick pickup, delivery or both"] },
  { icon: Video, title: "Dress video (required)", urdu: "ویڈیو لازمی", points: ["Record your actual dress yourself — no advertisements or downloaded clips", "Record a 15–30 second 360° video", "Slowly show front, back and details", "Without a video the listing won't go live", "Your video may be shared on Behen.pk's Instagram, TikTok & Facebook — cover faces or personal details with emojis/stickers if you want privacy (چہرہ چھپانے کے لیے ایموجی لگائیں)"] },
];

export default function HowToSell() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="How to list your dress | Behen.pk" description="Step-by-step guide for Bari Behens to list a bridal or partywear dress for rent or sale on Behen.pk." path="/how-to-sell" />
      <EnhancedHeader />
      <main className="container max-w-4xl py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">How to list your dress</h1>
          <p className="mt-2 text-lg text-muted-foreground" dir="rtl">اپنا جوڑا لسٹ کرنے کا طریقہ</p>
          <p className="mt-3 text-muted-foreground">7 simple steps — takes about 5 minutes.</p>
        </header>

        <div className="mb-6"><OwnDressNotice /></div>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{i + 1}. {s.title}</h2>
                    <span className="text-sm text-muted-foreground" dir="rtl">{s.urdu}</span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {s.points.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-primary/40 bg-primary/5">
          <CardContent className="flex gap-3 p-5">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm text-foreground">Your contact details are only shown to serious buyers who unlock them. Your listing stays live until you delete it or mark it sold, unless an admin pauses it for corrections. If that happens, read the note on your dashboard, edit the dress and choose Save & Republish.</p>
          </CardContent>
        </Card>

        <Card className="mt-6 border-primary/40">
          <CardContent className="flex gap-3 p-5">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-2 text-sm text-foreground">
              <p className="font-semibold">Rental security &amp; platform role</p>
              <p>For rentals, you may collect a security deposit of up to the full value of the dress, and/or hold the renter's original CNIC, directly from the renter.</p>
              <p className="text-muted-foreground">Behen.pk operates solely as a platform connecting Bari Behen and Choti Behen. Behen.pk does not collect or hold any security deposit and is not responsible for the condition, damage, loss or return of any dress. All handovers, condition checks and security refunds are settled directly between both parties.</p>
              <p className="text-muted-foreground" dir="rtl">کرایہ پر دیتے وقت آپ جوڑے کی مکمل قیمت کے برابر سیکیورٹی یا اصل شناختی کارڈ براہِ راست لے سکتی ہیں۔ Behen.pk صرف رابطے کا ذریعہ ہے، کوئی سیکیورٹی وصول نہیں کرتا اور جوڑے کے نقصان، گمشدگی یا واپسی کا ذمہ دار نہیں ہے۔</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild size="lg"><Link to="/list-dress">Start listing my dress</Link></Button>
        </div>
      </main>
    </div>
  );
}
