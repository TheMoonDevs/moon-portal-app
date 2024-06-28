import Image from "next/image";

const Invoice = () => {
  return (
    <section className="md:h-screen">
      <div className="p-8 bg-white shadow-md">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Image
              src="/icon-512x512.png"
              width={100}
              height={100}
              alt="logo"
              className="aspect-square mr-2"
            />
          </div>
          <h1 className="text-4xl  md:text-5xl font-normal font-serif">
            INVOICE
          </h1>
        </div>

        {/* Billed To Section */}
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
            <p className="text-sm">Invoice issued on 19th March 2024</p>
            <p className="text-sm">Invoice Id - C0101</p>
          </div>
        </div>

        {/* Invoice Table */}
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
                  <div className="absolute top-0 right-0 w-20 sm:w-24 md:w-32  border-t-2 border-gray-700"></div>
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

        {/* Payment Due Date */}
        <p className="text-sm mb-8">
          Please finish the payment by the due date: 31st March 2024
        </p>
        <p className="text-3xl  mb-8">Thank you!</p>

        {/* Payment Information */}
        <div className="flex flex-col sm:flex-row">
          <div className="md:w-1/2 md:pr-8">
            <h2 className="text-sm font-bold mb-2">PAYMENT INFORMATION</h2>
            <p className="text-sm">
              Crypto Wallet Address: <br />
              <span className="whitespace-normal flex-wrap">
                0x94751a6ecfd0f849286fe6c399eb0ac3bf05b141f
              </span>
              <br />
              <br />
              Bank Transfer: <br />
              Name: SUBHAKAR TIKKIREDDY <br />
              A/c No: 145410010035399 <br />
              IFSC - UBIN0836531
            </p>
          </div>
          <div className="md:w-1/2 mt-8 md:mt-0 sm:text-right flex justify-end  flex-col">
            <p className="text-xl font-normal sm:text-[22px] md:text-[25px] font-serif">
              Subhakar Tikkireddy
            </p>
            <p className="sm:text-lg">TheMoonDevs</p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Invoice;
