import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { PermissionErrorBoundary } from '@/components/global/PermissionErrorBoundary';
import { AdminUserEditor } from '@/components/screens/Admin/AdminUserEditor/AdminUserEditor';

export default function Home() {
  return (
    <PageAccess
      isAuthRequired={true}
      requiredPermission="users:edit"
      hasBottombar={false}
    >
      <PermissionErrorBoundary>
        <AdminUserEditor />
      </PermissionErrorBoundary>
      <Bottombar visible={false} />
    </PageAccess>
  );
}
