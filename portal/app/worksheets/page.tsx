import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import WorksheetView from '@/components/screens/Worksheets/WorksheetView';

export default function WorksheetsRoute() {
  return (
    <PageAccess isAuthRequired={true}>
      <WorksheetView />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
