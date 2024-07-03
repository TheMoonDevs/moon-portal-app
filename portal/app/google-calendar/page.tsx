import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import GoogleCalendarCard from "@/components/screens/GoogleCalendar/GoogleCalendarCard";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";

const googleCalendarPage = () => {
  return (
    <>
      <PageAccess isAuthRequired={true}>
        <div className="flex flex-col items-center justify-center min-h-screen py-10">
          <GoogleCalendarCard />
          <Bottombar visible={true} />
        </div>
      </PageAccess>
    </>
  );
};
export default googleCalendarPage;
