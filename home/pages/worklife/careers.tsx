import CareersHomePage from '@/components/Pages/worklife/careers/CareersHomePage';
import { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { createClient } from '@/prismicio';

const careers = ({
  jobPosts,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <CareersHomePage jobPosts={jobPosts} />
    </>
  );
};

export default careers;

export async function getStaticProps({ previewData }: GetStaticPropsContext) {
  const client = createClient({ previewData });
  const jobPosts = await client.getAllByType('jobapplication', {
    limit: 10,
    graphQuery: `{
      jobapplication {
        slices {
          ... on job {
            variation {
              ... on default {
                primary {
                  title
                  description
                  image
                  department
                }
              }
            }
          }
        }
      }
    }`,
  });

  return {
    props: { jobPosts },
    revalidate: 59, // 1 minute
  };
}
