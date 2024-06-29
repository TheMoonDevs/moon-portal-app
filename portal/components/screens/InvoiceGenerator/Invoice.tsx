import Image from "next/image";
import { InvoiceData } from "./InvoicePage";
import InvoiceTable from "./InvoiceTable";

interface InvoiceProps {
  pdfTargetRef: React.MutableRefObject<HTMLElement | any>;
  invoiceData: InvoiceData;
}

const Invoice: React.FC<InvoiceProps> = ({ pdfTargetRef, invoiceData }) => {
  return (
    <section>
      <div className="p-8  shadow-md bg-[#F5F5EF]" ref={pdfTargetRef}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Image
              src="/icon-512x512.png"
              width={100}
              height={100}
              alt="logo"
              className="aspect-square mr-2 pointer-events-none"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-normal font-serif">
            INVOICE
          </h1>
        </div>

        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-sm font-bold">BILLED TO:</h2>
            <p className="text-sm">
              NEIL SKALLI,
              <br />
              WAGMI COMPETITION
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              Invoice issued on {invoiceData.invoiceDate?.toLocaleDateString()}
            </p>
            <p className="text-sm">Invoice Id - {invoiceData.invoiceId}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <InvoiceTable />
        </div>

        <p className="text-sm mb-8">
          Please finish the payment by the due date:
          {invoiceData.dueDate ? invoiceData.dueDate.toLocaleDateString() : ""}
        </p>
        <p className="text-3xl mb-8">Thank you!</p>

        <div className="flex flex-col sm:flex-row">
          <div className="md:w-1/2 md:pr-8">
            <h2 className="text-sm font-bold mb-2">PAYMENT INFORMATION</h2>
            <p className="text-sm">
              Crypto Wallet Address: <br />
              <span className="whitespace-normal flex-wrap">
                {invoiceData.cryptoAddress}
              </span>
              <br />
              <br />
              Bank Transfer: <br />
              Name: {invoiceData.bankDetails.name} <br />
              A/c No:{invoiceData.bankDetails.account} <br />
              IFSC - {invoiceData.bankDetails.ifsc}
            </p>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0 w-full sm:text-right flex justify-end  flex-col">
            <p className="text-xl font-normal sm:text-[22px] md:text-[25px] font-serif">
              {invoiceData.payingTo}
            </p>
            <p className="sm:text-lg">{invoiceData.companyName}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Invoice;
