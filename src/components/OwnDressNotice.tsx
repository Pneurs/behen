import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera } from "lucide-react";
export default function OwnDressNotice({ video = false }: { video?: boolean }) {
  return <Alert className="border-primary/30 bg-primary/5">
    <Camera className="h-4 w-4" />
    <AlertDescription className="space-y-2">
      <p><strong>{video ? "Your own dress video only." : "Real photos of your own dress only."}</strong> {video ? "Record the actual dress you are listing. Do not upload brand advertisements, runway clips or videos downloaded from other websites." : "Take your own photos of the actual dress you are listing. Do not use brand catalog pictures, screenshots or photos copied from other websites."} Show its current condition and any flaws honestly. Listings using someone else's media may be paused for correction.</p>
      <p dir="rtl">صرف اپنے اصل جوڑے کی خود بنائی ہوئی تصاویر اور ویڈیو اپ لوڈ کریں۔ برانڈ کی تصاویر، اشتہارات یا دوسری ویب سائٹس سے لی گئی تصاویر اور ویڈیوز استعمال نہ کریں۔ جوڑے کی موجودہ حالت اور خامیاں واضح دکھائیں۔ ایسی لسٹنگ درستگی کے لیے روکی جا سکتی ہے۔</p>
    </AlertDescription>
  </Alert>;
}