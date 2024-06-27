import Invoice from "./Invoice";
import InvoiceModel from "./InvoiceModel";

const InvoicePage = () => {
  return (
    <>
      <section className="w-full md:w-1/2 p-4 border overflow-y-auto  mb-14 flex-1">
        <Invoice />
      </section>
      <section className="w-full md:w-1/2 p-4 flex-1 overflow-y-auto">
        <InvoiceModel />
      </section>
    </>
  );
};
export default InvoicePage;
