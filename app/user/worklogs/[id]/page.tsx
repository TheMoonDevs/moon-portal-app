import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogView } from "@/components/screens/Worklogs/WorklogView";

export default function WorklogViewPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogView />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
