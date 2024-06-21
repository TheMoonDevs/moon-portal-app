import { PageAccess } from "@/components/global/PageAccess";
import EmailTrackerCard from "@/components/screens/EmailTracker/EmailTrackerCard";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";

const EmailTracker = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={true}>
      <div className="container mx-auto px-4">
        <Link
          href={APP_ROUTES.home}
          className="cursor-pointer rounded-lg p-2 pt-3 flex items-center gap-2 text-neutral-900 hover:text-neutral-700 transition-colors duration-300"
        >
          <span className="icon_size material-icons">arrow_back</span>
          <h1 className="uppercase tracking-[0.2em] font-mono text-xl">Back</h1>
        </Link>
        <div className="flex items-center justify-center min-h-screen  gap-6 py-12">
          <EmailTrackerCard />
        </div>
      </div>
    </PageAccess>
  );
};
export default EmailTracker;
