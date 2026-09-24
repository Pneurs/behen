import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/seo";

interface SeoProps {
  title: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({ title, description, path, image, noindex, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const desc = description?.slice(0, 160);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
