import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import EngagementsPage from "@/components/screens/Engagements/EngagementsPage";
import { HomePage } from "@/components/screens/Home/HomePage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <EngagementsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
