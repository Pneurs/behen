import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="flex flex-col items-start">
          <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>Behen.pk</span>
          <span className="text-xs text-muted-foreground font-urdu" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>بہنیں تو سب شیئر کرتی ہیں</span>
        </Link>
      </div>
    </header>
  );
};
