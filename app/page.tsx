import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HomePage } from "@/components/screens/Home/HomePage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={true}>
      <HomePage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
