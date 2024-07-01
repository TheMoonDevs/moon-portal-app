"use client";
import { ChangeEvent, useRef, useState } from "react";
import Invoice from "./Invoice";
import InvoiceModal from "./InvoiceModal";
import InvoiceHeader from "./InvoiceHeader";

export interface InvoiceData {
  invoiceId: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  paymentMethod: string;
  cryptoAddress: string;
  payingTo: string;
  companyName: string;
  bankDetails: {
    name: string;
    account: string;
    ifsc: string;
  };
}

const InvoicePage = () => {
  const [showInput, setShowInput] = useState<boolean>(false);
  const today = new Date(); // Get today's date
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 7);

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceId: "",
    invoiceDate: today,
    dueDate: dueDate,
    paymentMethod: "bank",
    cryptoAddress: "0x94751a6ecfd0f849286fe6c399eb0ac3bf05b141f",
    payingTo: "Subhakar Tikkireddy",
    companyName: "TheMoonDevs",
    bankDetails: {
      name: "SUBHAKAR TIKKIREDDY",
      account: "145410010035399",
      ifsc: "UBIN0836531",
    },
  });

  const pdfTargetRef = useRef<HTMLElement | any>(null);

  const toggleInput = () => {
    setShowInput(!showInput);
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name.includes("bank")) {
      const field = name.split("-")[1];
      setInvoiceData((prevData) => ({
        ...prevData,
        bankDetails: { ...prevData.bankDetails, [field]: value },
      }));
    } else {
      setInvoiceData({ ...invoiceData, [name]: value });
    }
  };

  const handleDateChange = (
    fieldName: "invoiceDate" | "dueDate",
    newValue: Date | null
  ) => {
    setInvoiceData({
      ...invoiceData,
      [fieldName]: newValue,
    });
  };

  const handlePaymentMethodChange = (event: any) => {
    setInvoiceData({ ...invoiceData, paymentMethod: event.target.value });
  };

  const handleOwnerInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInvoiceData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <>
      <header className="w-full">
        <InvoiceHeader
          pdfTargetRef={pdfTargetRef}
          toggleInput={toggleInput}
          showInput={showInput}
        />
      </header>
      <main className="flex flex-col md:flex-row h-full overflow-hidden">
        <div className="flex flex-col md:flex-row w-full h-full">
          <div className="block md:hidden bg-[#F5F5EF] h-full">
            {showInput && (
              <div className="overflow-y-auto h-full">
                <InvoiceModal
                  invoiceData={invoiceData}
                  handleInputChange={handleInputChange}
                  handleDateChange={handleDateChange}
                  handlePaymentMethodChange={handlePaymentMethodChange}
                  handleOwnerInfoChange={handleOwnerInfoChange}
                />
              </div>
            )}
          </div>
          <section className="w-full md:w-1/2 p-4 border-dashed border mb-14 overflow-y-auto shadow-lg rounded-lg">
            <Invoice pdfTargetRef={pdfTargetRef} invoiceData={invoiceData} />
          </section>
          <section className="w-full md:w-1/2 p-4">
            <div className="hidden md:block overflow-y-auto mb-10 rounded-lg h-full">
              <InvoiceModal
                invoiceData={invoiceData}
                handleInputChange={handleInputChange}
                handleDateChange={handleDateChange}
                handlePaymentMethodChange={handlePaymentMethodChange}
                handleOwnerInfoChange={handleOwnerInfoChange}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default InvoicePage;
