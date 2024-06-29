import Image from "next/image";

interface InvoiceProps {
  pdfTargetRef: React.MutableRefObject<HTMLElement | any>;
  invoiceData: any;
}

const Invoice: React.FC<InvoiceProps> = ({ pdfTargetRef, invoiceData }) => {
  return (
    <section>
      <div className="p-8 bg-white shadow-md" ref={pdfTargetRef}>
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
              Invoice issued on {invoiceData.invoiceDate.toLocaleDateString()}
            </p>
            <p className="text-sm">Invoice Id - {invoiceData.invoiceId}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Service</th>
                <th className="text-left p-2">Weeks</th>
                <th className="text-left p-2">Unit Price</th>
                <th className="text-left p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">Refactoring of WAGMI</td>
                <td className="p-2">2</td>
                <td className="p-2">$200</td>
                <td className="p-2">$400</td>
              </tr>
              <tr className="border-b">
                <td className="p-2">Migration + BugFixes + SocialLogin</td>
                <td className="p-2">1</td>
                <td className="p-2">$200</td>
                <td className="p-2">$200</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold text-right" colSpan={3}>
                  Subtotal
                </td>
                <td className="p-2">$600</td>
              </tr>

              <tr>
                <td
                  colSpan={3}
                  className="p-2 font-bold text-xl md:text-2xl text-right relative"
                >
                  <div className="absolute top-0 right-0 w-20 sm:w-24 md:w-32 border-t-2 border-gray-700"></div>
                  Total
                </td>
                <td className="p-2 font-bold text-xl md:text-2xl relative">
                  <div className="absolute top-0 right-0 w-20 sm:w-24 md:w-32 lg:w-36 border-t-2 border-gray-700"></div>
                  $600
                </td>
              </tr>
            </tbody>
          </table>
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
