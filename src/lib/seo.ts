export const SITE_URL = "https://behen.pk";

export const SEO_CITIES = [
  "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
];

export const SEO_CATEGORIES: Record<string, string> = {
  bridal: "Bridal Dresses",
  barat: "Barat Dresses",
  walima: "Walima Dresses",
  formal: "Formal Dresses",
  party_wear: "Party Wear",
  footwear: "Footwear",
  accessories: "Accessories",
  jewelry: "Jewelry",
  bags: "Bags",
};

export const categoryToSlug = (c: string) => c.replace(/_/g, "-");
export const slugToCategory = (s?: string) => {
  if (!s) return undefined;
  const key = s.toLowerCase().replace(/-/g, "_");
  return SEO_CATEGORIES[key] ? key : undefined;
};
export const cityToSlug = (c: string) => c.toLowerCase().replace(/\s+/g, "-");
export const slugToCity = (s?: string) => {
  if (!s) return undefined;
  const found = SEO_CITIES.find((c) => cityToSlug(c) === s.toLowerCase());
  return found || s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

/** Build a clean landing URL, e.g. /rent/lahore/bridal */
export const landingPath = (type: "rent" | "buy", city?: string, category?: string) =>
  `/${type}${city ? `/${cityToSlug(city)}` : ""}${category ? `/${categoryToSlug(category)}` : ""}`;
