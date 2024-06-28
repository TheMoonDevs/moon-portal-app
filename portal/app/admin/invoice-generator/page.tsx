import { PageAccess } from "@/components/global/PageAccess";
import InvoiceHeader from "@/components/screens/InvoiceGenerator/InvoiceHeader";
import InvoicePage from "@/components/screens/InvoiceGenerator/InvoicePage";

const InvoiceGenerator = () => {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={false}>
      <div className="h-screen w-full overflow-hidden">
        <header className="fixed top-0 left-0 w-full z-10">
          <InvoiceHeader />
        </header>
        <main className="flex flex-col md:flex-row h-full mt-14 overflow-hidden">
          <InvoicePage />
        </main>
      </div>
    </PageAccess>
  );
};

export default InvoiceGenerator;
