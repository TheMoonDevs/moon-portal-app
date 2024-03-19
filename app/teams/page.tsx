import { Bottombar } from "@/components/global/Bottombar";
import { HomePage } from "@/components/screens/Home/HomePage";
import { TeamsPage } from "@/components/screens/Teams/TeamsPage";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <TeamsPage />
      <Bottombar visible={true} />
    </>
  );
}
