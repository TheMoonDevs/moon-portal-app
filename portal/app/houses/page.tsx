import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { HousesPage } from "@/components/screens/Houses/HousesPage";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <HousesPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
