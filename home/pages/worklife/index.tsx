import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import { createClient } from "@/prismicio";
import { WorklifeFooter } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeFooter";
import { WorklifePageStyled } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifePage.styles";
import { WorklifeCareers } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeCareers";
import { WorklifeHeroSection } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeHeroSection";
import { WorklifeDetails } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeDetails";
import * as prismic from "@prismicio/client";
export default function Page({
  blogs,
  jobPosts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <WorklifePageStyled>
      <WorklifeHeroSection />
      <WorklifeDetails blogs={blogs} />
      <WorklifeCareers jobPosts={jobPosts} />
      <WorklifeFooter />
    </WorklifePageStyled>
  );
}

export async function getStaticProps({ previewData }: GetStaticPropsContext) {
  const client = createClient({ previewData });

  const blogs = await client.getAllByType("blog_page", {
    // limit: 6,
    filters: [
      prismic.filter.any("my.blog_page.card_type", [
        "Small Card",
        "Large Card",
      ]),
    ],
    graphQuery: `{
      blog_page {
        card_type
        slices {
          ... on hero {
            variation {
              ... on customHero1 {
                primary {
                  title
                  subtitle
                  image
                  caption
                }
              }
              ... on customHero2 {
                primary {
                  title
                  subtitle
                  image
                  caption
                }
              }
            }
        }
        }
      }
    }`,
  });

  const jobPosts = await client.getAllByType("jobapplication", {
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
                }
              }
            }
        }
        }
      }
    }`,
  });

  return {
    props: { blogs, jobPosts },
    revalidate: 60 * 60, // 1 hour
  };
}