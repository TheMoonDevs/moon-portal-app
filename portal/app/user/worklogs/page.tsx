import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogsPage } from "@/components/screens/Worklogs/WorklogsPage";

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogsPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
