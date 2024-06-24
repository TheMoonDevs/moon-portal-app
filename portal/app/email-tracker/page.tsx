import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import EmailTrackerCard from "@/components/screens/EmailTracker/EmailTrackerCard";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";

const EmailTracker = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={false}>
      <div className="mx-auto px-1 md:px-4 pb-5">
        <div className="flex items-center lg:justify-center md:min-h-screen max-w-screen overflow-x-auto">
          <EmailTrackerCard />
        </div>
      </div>
      <Bottombar visible={true} />
    </PageAccess>
  );
};
export default EmailTracker;
