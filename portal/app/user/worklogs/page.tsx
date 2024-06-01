import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogsPage } from "@/components/screens/Worklogs/WorklogsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest.json", // we are accessing our manifest file here
  title: "My Worklogs - TheMoonDevs",
  // TODO - change favicon to check icon on green circle
  // icon: "/favicon.ico",
};

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
