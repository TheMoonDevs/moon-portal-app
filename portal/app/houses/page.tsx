import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HomePage } from "@/components/screens/Home/HomePage";
import { HousesPage } from "@/components/screens/Houses/HousesPage";
import { TeamsPage } from "@/components/screens/Teams/TeamsPage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <HousesPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
