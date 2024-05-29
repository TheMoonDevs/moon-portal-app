import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HomePage } from "@/components/screens/Home/HomePage";
import { TeamsPage } from "@/components/screens/Teams/TeamsPage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <TeamsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
