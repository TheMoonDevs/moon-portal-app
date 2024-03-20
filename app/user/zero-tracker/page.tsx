import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogsPage } from "@/components/screens/User/WorklogsPage";
import { ZeroTrackerPage } from "@/components/screens/ZeroTracker/ZeroTracker";

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <ZeroTrackerPage />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
