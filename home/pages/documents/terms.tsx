import {
  DocumentPage,
  DocumentPageType,
} from "@/components/Pages/docs/DocumentPage";

const Terms = () => {
  //   const sanitizedData = () => ({
  //     __html: DOMPurify.sanitize(data),
  //   });

  return <DocumentPage docType={DocumentPageType.TERMS} />;
};

export default Terms;

export const getStaticProps = async () => {
  return {
    props: {
      meta: {
        robots: "noindex,nofollow",
      },
    },
  };
};
