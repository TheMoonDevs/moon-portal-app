import Head from 'next/head';
import { APP_INFO, IN_DEV, IN_TESTNET } from '@/utils/constants/AppInfo';

const MetaInfo = ({
  title,
  description,
  keywords,
  robots,
  openGraph,
  enableOpenGraph,
  enableTwitter,
  twitter,
  structuredData,
}: MetaInfoProps) => {
  const fullTitle = title || APP_INFO.title;
  const fullDescription = description || APP_INFO.description;
  const fullImage =
    openGraph?.image || `${APP_INFO.base_url}${APP_INFO.image_url}`;
  const fullUrl = openGraph?.url || APP_INFO.base_url;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, shrink-to-fit=no"
      />
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywords || APP_INFO.default_keywords} />
      <meta
        name="robots"
        content={
          IN_TESTNET || IN_DEV ? 'noindex,nofollow' : robots || 'index,follow'
        }
      />

      {/* Canonical Url */}
      <link rel="canonical" href={fullUrl} />

      {/* Optional Open Graph Meta Tags */}
      {(enableOpenGraph || openGraph) && (
        <>
          <meta property="og:type" content={openGraph?.ogType || 'website'} />
          <meta property="og:title" content={openGraph?.title || fullTitle} />
          <meta
            property="og:description"
            content={openGraph?.description || fullDescription}
          />
          <meta property="og:image" content={fullImage} />
          <meta property="og:url" content={fullUrl} />
          <meta property="og:site_name" content={APP_INFO.title} />
        </>
      )}

      {/* Optional Twitter Meta Tags */}
      {(enableTwitter || twitter) && (
        <>
          <meta
            name="twitter:card"
            content={twitter?.cardType || 'summary_large_image'}
          />
          <meta name="twitter:title" content={twitter?.title || fullTitle} />
          <meta
            name="twitter:description"
            content={twitter?.description || fullDescription}
          />
          <meta name="twitter:image" content={twitter?.image || fullImage} />
          <meta name="twitter:url" content={twitter?.url || fullUrl} />
        </>
      )}

      {/* Optional Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Head>
  );
};

export interface MetaInfoProps {
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
  enableOpenGraph?: boolean;
  enableTwitter?: boolean;
  openGraph?: {
    ogType?: string;
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  twitter?: {
    cardType?: string;
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  structuredData?: Record<string, any>; // Allows flexibility for structured data
}

export default MetaInfo;
