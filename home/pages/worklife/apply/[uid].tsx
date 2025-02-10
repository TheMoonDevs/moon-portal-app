import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import Head from "next/head";
import { isFilled, asLink } from "@prismicio/client";
import { SliceZone } from "@prismicio/react";
import { createClient } from "@/prismicio";
import { JobApplicationPage } from "@/components/Pages/worklife/JobApply/JobApplicationPage";
import GoogleSheetsAPI from "@/utils/service/googleSpreadsheetSDk";

type Params = { uid: string };

export default function Page({
  spreadsheetId,
  sheetId,
  rowHeaders,
  page,
}: {
  spreadsheetId: string;
  sheetId: string;
  rowHeaders: string[];
} & InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{page?.data?.meta_title}</title>
        {isFilled.keyText(page?.data?.meta_description) ? (
          <meta name="description" content={page?.data?.meta_description} />
        ) : null}
      </Head>
      {page?.data.slices.length > 0 && page?.data.slices[0] && (
        <JobApplicationPage
          slice={page?.data.slices[0]}
          spreadsheetId={spreadsheetId}
          sheetId={sheetId}
          rowHeaders={rowHeaders}
        />
      )}
    </>
  );
}

export async function getStaticProps({
  params,
  previewData,
}: GetStaticPropsContext<Params>) {
  const client = createClient({ previewData });
  const page = await client.getByUID("jobapplication", params?.uid as string);
  const spreadsheetUrl = page?.data?.slices[0]?.primary?.spreadsheet_url || "";
  const spreadsheetId = spreadsheetUrl.split("/")[5];
  const sheetId = spreadsheetUrl.split("=")[1].split("#")[0];

  const googleSheetsAPI = new GoogleSheetsAPI({
    clientEmail: process.env.GIAM_CLIENT_EMAIL as string,
    privateKey: process.env.GIAM_PRIVATE_KEY as string,
  });
  
  const response = await googleSheetsAPI.getSheetData({
    spreadsheetId,
    range: "A1:Z1",
    targetId: sheetId,
  });

  // console.log("Spreadsheet data:", response);
  if (!response?.values || response?.values?.length <= 0) {
    const rowHeaders = [""];
    return {
      props: {
        page,
        spreadsheetId,
        sheetId,
        rowHeaders,
      },
    };
  }
  const rowHeaders = (response.values as any[][])[0];
  for (let i = 0; i < rowHeaders.length; i++) {
    if (rowHeaders[i].split(":")[1]?.includes("hide")) {
      rowHeaders[i] = "";
    }
  }
  return {
    props: {
      page,
      spreadsheetId,
      sheetId,
      rowHeaders,
    },
  };
}

export async function getStaticPaths() {
  const client = createClient();

  const pages = await client.getAllByType("jobapplication");

  return {
    paths: pages? pages.map((page) => {
      return asLink(page);
    }) : ["undefined"],
    fallback: false,
  };
}
