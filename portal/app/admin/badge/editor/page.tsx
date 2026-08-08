import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { PermissionErrorBoundary } from '@/components/global/PermissionErrorBoundary';
import BadgeEditor from '@/components/screens/Admin/badge-template/BadgeEditor';

export default function BadgeEditorPage() {
  return (
    <PageAccess
      isAuthRequired={true}
      requiredPermission="badges:edit"
      hasBottombar={false}
    >
      <PermissionErrorBoundary>
        <BadgeEditor />
      </PermissionErrorBoundary>
      <Bottombar visible={false} />
    </PageAccess>
  );
}
