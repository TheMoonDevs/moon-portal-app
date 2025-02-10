import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import Head from "next/head";
import { isFilled, asLink } from "@prismicio/client";
import { SliceZone } from "@prismicio/react";
import { HeroSliceDefault } from "@/prismicio-types";
import { components } from "@/components/Pages/worklife/BlogPageSlices";
import { createClient } from "@/prismicio";
import { WorklifeHeader } from "@/components/Pages/worklife/Header/WorklifeHeader";
import { WorklifeFooter } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifeFooter";
import { WorklifePageStyled } from "@/components/Pages/worklife/WorkLifeHomePage/WorklifePage.styles";

type Params = { uid: string };

export const runtime = "experimental-edge";

export default function Page({
  page,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const heroSlice = page.data.slices.find(
    (slice) => slice.slice_type === 'hero'
  ) as HeroSliceDefault;
  return (
    <WorklifePageStyled>
      <Head>
        <title>{page.data.meta_title}</title>
        {isFilled.keyText(page.data.meta_description) ? (
          <meta name="description" content={page.data.meta_description} />
        ) : null}
      </Head>
      <WorklifeHeader
        title={page.data.meta_title?.toString()}
        imageUrl={heroSlice?.primary.image.url as string}
      >
        <SliceZone
          slices={page.data.slices}
          context={{ last_publication_date: page.last_publication_date }}
          components={components}
        />
      </WorklifeHeader>
      <WorklifeFooter />
    </WorklifePageStyled>
  );
}

export async function getStaticProps({
  params,
  previewData,
}: GetStaticPropsContext<Params>) {
  const client = createClient({ previewData });

  const page = await client.getByUID("blog_page", params!.uid);

  return {
    props: { page },
  };
}

export async function getStaticPaths() {
  const client = createClient();

  const pages = await client.getAllByType("blog_page");

  return {
    paths: pages ? pages.map((page) => {
      return asLink(page);
    }) : ["undefined"],
    fallback: false,
  };
}
