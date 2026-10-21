import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Lock, FileText, Tag, ClipboardList, MapPin, Video, ShieldCheck } from "lucide-react";

const steps = [
  { icon: Camera, title: "Main photos", urdu: "مین تصاویر", points: ["Front photo of the full dress in daylight", "Plain background, no faces needed", "These photos are visible to everyone"] },
  { icon: Lock, title: "Extra private photos", urdu: "اضافی تصاویر", points: ["Up to 5 close-ups: embroidery, back, dupatta", "Only signed-in buyers can see them", "Show any flaws honestly — builds trust"] },
  { icon: FileText, title: "Dress details", urdu: "تفصیلات", points: ["Category, size, colour and designer", "Mention if alterations are possible", "Don't write phone numbers — they get blocked"] },
  { icon: Tag, title: "Pricing", urdu: "قیمت", points: ["Choose Rent, Sell or both", "Add the original price so buyers see the discount", "Set rental price per day and security deposit"] },
  { icon: ClipboardList, title: "Instructions", urdu: "ہدایات", points: ["Care and washing notes", "Return condition rules for renters", "Block dates when the dress isn't available"] },
  { icon: MapPin, title: "Location & delivery", urdu: "مقام اور ڈلیوری", points: ["Choose your city and area only", "Your exact address stays private", "Pick pickup, delivery or both"] },
  { icon: Video, title: "Dress video (required)", urdu: "ویڈیو لازمی", points: ["Record a 15–30 second 360° video", "Slowly show front, back and details", "Without a video the listing won't go live"] },
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
            <p className="text-sm text-foreground">Your contact details are only shown to serious buyers who unlock them. Your listing stays live for 15 days and can be reactivated for free.</p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild size="lg"><Link to="/list-dress">Start listing my dress</Link></Button>
        </div>
      </main>
    </div>
  );
}
