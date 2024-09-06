import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import BadgeEditor from '@/components/screens/Admin/badge-template/BadgeEditor';

export default function BadgeEditorPage() {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={true}>
      <BadgeEditor />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
