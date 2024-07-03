import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HomePage } from "@/components/screens/Home/HomePage";
import Image from "next/image";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      {/* <HomePage /> */}
      <h1 className="text-3xl font-semibold text-center mt-10">Notifications Page</h1>
      <Bottombar visible={true} />
    </PageAccess>
  );
}
