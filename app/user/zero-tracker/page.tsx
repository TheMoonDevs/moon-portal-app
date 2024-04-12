import { PageAccess } from "@/components/global/PageAccess";
import ShowHideBottomBar from "@/components/screens/ZeroTracker/ShowHideBottomBar";
import { ZeroTrackerPage } from "@/components/screens/ZeroTracker/ZeroTracker";

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <ZeroTrackerPage />
      <ShowHideBottomBar />
    </PageAccess>
  );
}
