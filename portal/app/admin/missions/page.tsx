import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HomePage } from "@/components/screens/Home/HomePage";
import { MissionsPage } from "@/components/screens/Missions/MissionsPage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <MissionsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
