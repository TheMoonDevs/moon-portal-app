import {
  DocumentPage,
  DocumentPageType,
} from "@/components/Pages/docs/DocumentPage";

const Privacy = () => {
  return <DocumentPage docType={DocumentPageType.PRIVACY} />;
};

export default Privacy;

export const getStaticProps = async () => {
  return {
    props: {
      meta: {
        robots: "noindex,nofollow",
      },
    },
  };
};
