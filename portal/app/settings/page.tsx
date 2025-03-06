import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import Settings from '@/components/screens/Settings/Settings';

const SettingsPage = () => {
  return (
    <PageAccess isAuthRequired={true}>
      <Settings />
      <Bottombar visible={true} />
    </PageAccess>
  );
};

export default SettingsPage;
