import { Link } from "react-router-dom";
import { useBranding } from "@/hooks/useBranding";

export const Header = () => {
  const { data: branding } = useBranding();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="flex flex-col items-start">
          {branding?.logoType === 'image' && branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <>
              <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Behen.pk</span>
              <span className="text-xs text-muted-foreground font-urdu" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>بہنیں تو سب شیئر کرتی ہیں</span>
            </>
          )}
        </Link>
      </div>
    </header>
  );
};
