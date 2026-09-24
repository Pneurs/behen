import { Link } from "react-router-dom";
import { SEO_CATEGORIES, SEO_CITIES, landingPath } from "@/lib/seo";

const MAIN = ["bridal", "barat", "walima", "formal", "party_wear"];

/** Internal links to city / category landing pages (helps Google find them). */
export default function SeoLinks({ city }: { city?: string }) {
  const cities = city ? [city] : SEO_CITIES.slice(0, 6);
  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold mb-4">Popular searches</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((c) => (
          <div key={c}>
            <h3 className="font-medium mb-2">{c}</h3>
            <ul className="space-y-1 text-sm">
              {MAIN.map((cat) => (
                <li key={cat}>
                  <Link to={landingPath("rent", c, cat)} className="text-muted-foreground hover:text-primary">
                    {SEO_CATEGORIES[cat]} on rent in {c}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={landingPath("buy", c)} className="text-muted-foreground hover:text-primary">
                  Buy pre-loved dresses in {c}
                </Link>
              </li>
            </ul>
          </div>
        ))}
      </div>
      {city && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {SEO_CITIES.filter((c) => c !== city).map((c) => (
            <Link key={c} to={landingPath("rent", c)} className="rounded-full border px-3 py-1 hover:border-primary">
              Dresses on rent in {c}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
