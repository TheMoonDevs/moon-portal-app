import Image from "next/image";
import { InvoiceData } from "./InvoicePage";
import InvoiceTable from "./InvoiceTable";
import EditableText from "./EditableText";

interface InvoiceProps {
  pdfTargetRef: React.MutableRefObject<HTMLElement | any>;
  invoiceData: InvoiceData;
}

const Invoice: React.FC<InvoiceProps> = ({ pdfTargetRef, invoiceData }) => {
 function formatDate(dateString: any) {
   const date = new Date(dateString);
   const day = date.getDate(); // Get day of the month (1-31)
   const month = date.toLocaleString("en-US", { month: "long" }); // Get full month name
   const year = date.getFullYear(); // Get full year

   // Determine the day suffix (st, nd, rd, th)
   let daySuffix;
   if (day === 1 || day === 21 || day === 31) {
     daySuffix = "st";
   } else if (day === 2 || day === 22) {
     daySuffix = "nd";
   } else if (day === 3 || day === 23) {
     daySuffix = "rd";
   } else {
     daySuffix = "th";
   }

   return `${day}${daySuffix} ${month} ${year}`;
 }


  return (
    <section ref={pdfTargetRef} className="bg-white">
      <div className="p-8  shadow-md ">
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
              <EditableText initialValue="" placeholder="Client Name" />
              <EditableText initialValue="" placeholder="Client Company Name" />
            </p>
          </div>
          <div className="text-right">
            Invoice issued on {formatDate(invoiceData.invoiceDate)}
            <p className="text-sm">Invoice Id - {invoiceData.invoiceId}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <InvoiceTable />
        </div>

        <p className="text-sm mb-8">
          Please finish the payment by the due date:{" "}
          {invoiceData.dueDate ? formatDate(invoiceData.dueDate) : ""}
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
