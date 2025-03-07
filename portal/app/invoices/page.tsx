import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import ClientsInvoice from '@/components/screens/ClientsInvoice/ClientsInvoice';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <ClientsInvoice />
      <Bottombar visible={true} />
    </PageAccess>
  );
}
