import { PageAccess } from "@/components/global/PageAccess";
import InvoiceGeneratorPage from "@/components/screens/InvoiceGenerator/InvoiceGeneratorPage";
import InvoiceHeader from "@/components/screens/InvoiceGenerator/InvoiceHeader";

const InvoiceGenerator = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={false}>
      <InvoiceHeader />
      <InvoiceGeneratorPage />
    </PageAccess>
  );
};
export default InvoiceGenerator;
