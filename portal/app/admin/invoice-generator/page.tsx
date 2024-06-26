import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import InvoiceGeneratorPage from "@/components/screens/InvoiceGenerator/InvoiceGeneratorPage";

const InvoiceGenerator = () => {
  return (
    <PageAccess isAuthRequired={true}>
      <InvoiceGeneratorPage />
      <Bottombar visible={true} />
    </PageAccess>
  );
};
export default InvoiceGenerator;
