import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import GoogleCalendarCard from '@/components/screens/GoogleCalendar/GoogleCalendarCard';

const googleCalendarPage = () => {
  return (
    <>
      <PageAccess isAuthRequired={true}>
        <div className="flex min-h-screen flex-col items-center justify-center py-10">
          <GoogleCalendarCard />
          <Bottombar visible={true} />
        </div>
      </PageAccess>
    </>
  );
};
export default googleCalendarPage;
