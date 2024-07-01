import { PageAccess } from "@/components/global/PageAccess";
import InvoicePage from "@/components/screens/InvoiceGenerator/InvoicePage";

const InvoiceGenerator = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={false}>
      <div className="h-screen bg-[#F5F5EF] w-full overflow-hidden">
        <InvoicePage />
      </div>
    </PageAccess>
  );
};

export default InvoiceGenerator;
