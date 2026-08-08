import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { PermissionErrorBoundary } from '@/components/global/PermissionErrorBoundary';
import WorksheetView from '@/components/screens/Worksheets/WorksheetView';

export default function WorksheetsRoute() {
  return (
    <PageAccess isAuthRequired={true}>
      <PermissionErrorBoundary>
        <WorksheetView />
      </PermissionErrorBoundary>
      <Bottombar visible={true} />
    </PageAccess>
  );
}
