import Head from "next/head";
import { APP_INFO, IN_DEV, IN_TESNTET } from "@/utils/constants/AppInfo";

const MetaInfo = (props: { meta: MetaInfoProps }) => {
  const { title, description, ogType, image, url, keywords, robots } =
    props.meta || {};

  return (
    <Head>
      <title>{title || APP_INFO.title}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, shrink-to-fit=no"
      />
      <meta name="og:type" content={ogType || "summary"}></meta>
      <meta name="description" content={description || APP_INFO.description} />
      <meta name="keywords" content={keywords || APP_INFO.default_keywords} />
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {image && (
        <meta property="og:image" content={`${APP_INFO.base_url}${image}`} />
      )}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={APP_INFO.base_url} />
      {IN_TESNTET || IN_DEV ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : robots ? (
        <meta name="robots" content={robots} />
      ) : (
        <meta name="robots" content="index,nofollow" />
      )}
    </Head>
  );
};

export interface MetaInfoProps {
  title: string | null;
  description: string | null;
  ogType: string | null;
  image: string | null;
  url: string;
  keywords: string | null;
  robots: string | null;
}

export default MetaInfo;
