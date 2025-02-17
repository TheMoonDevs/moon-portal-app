import { PageAccess } from '@/components/global/PageAccess';

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <div>Client's Invoices Page</div>
    </PageAccess>
  );
}
