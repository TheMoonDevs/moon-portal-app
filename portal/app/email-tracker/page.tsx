import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import EmailTrackerCard from '@/components/screens/EmailTracker/EmailTrackerCard';

const EmailTracker = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={false}>
      <div className="mx-auto px-1 pb-5 md:px-4">
        <div className="max-w-screen flex items-center overflow-x-auto md:min-h-screen lg:justify-center">
          <EmailTrackerCard />
        </div>
      </div>
      <Bottombar visible={true} />
    </PageAccess>
  );
};
export default EmailTracker;
