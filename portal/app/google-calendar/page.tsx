import { PageAccess } from "@/components/global/PageAccess";
import GoogleCalendarCard from "@/components/screens/GoogleCalendar/GoogleCalendarCard";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";

const googleCalendarPage = () => {
  return (
    <>
      <PageAccess isAuthRequired={true}>
        <Link
          href={APP_ROUTES.home}
          className="cursor-pointer rounded-lg p-2 pt-3 flex items-center gap-2 text-neutral-900 hover:text-neutral-700"
        >
          <span className="icon_size material-icons">arrow_back</span>
          <h1 className="uppercase tracking-[0.2em] font-mono text-xl">Back</h1>
        </Link>
        <div className="flex flex-col items-center justify-center  ">
          <GoogleCalendarCard />
        </div>
      </PageAccess>
    </>
  );
}
export default googleCalendarPage;