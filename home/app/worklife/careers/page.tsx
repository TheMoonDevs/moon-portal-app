import CareersHomePage from '@/components/Pages/worklife/careers/CareersHomePage';
import { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { createClient } from '@/prismicio';

const careers = async () => {
  const client = createClient();
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

  return (
    <>
      <CareersHomePage jobPosts={jobPosts} />
    </>
  );
};

export default careers;
