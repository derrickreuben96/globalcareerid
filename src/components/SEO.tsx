import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  path: string; // canonical relative path, e.g. "/about"
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
}

const SITE = 'https://globalcareerid.com';

export function SEO({ title, description, path, image, type = 'website', jsonLd, noIndex }: SEOProps) {
  const url = `${SITE}${path}`;
  const ogImage = image || 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cef9a475-a227-4919-a3a6-1907c7bea88e/id-preview-e3a381b3--0a7945f4-acf7-4810-ac4b-09248a30f02b.lovable.app-1777449223681.png';
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
