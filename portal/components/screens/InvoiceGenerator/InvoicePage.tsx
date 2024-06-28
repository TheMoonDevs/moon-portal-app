"use client";
import { useRef, useState } from "react";
import Invoice from "./Invoice";
import InvoiceModal from "./InvoiceModel";
import InvoiceHeader from "./InvoiceHeader";

const InvoicePage = () => {
  const [showInput, setShowInput] = useState(false);
  const pdfTargetRef = useRef<HTMLElement | any>(null);

  const toggleInput = () => {
    setShowInput(!showInput);
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
          <div className="block md:hidden">{showInput && <InvoiceModal />}</div>
          <section className="w-full md:w-1/2 p-4">
            <div className="hidden md:block overflow-y-auto mb-10 rounded-lg">
              <InvoiceModal />
            </div>
          </section>
          <section className="w-full md:w-1/2 p-4 border-dashed border mb-14 overflow-y-auto shadow-lg rounded-lg">
            <Invoice pdfTargetRef={pdfTargetRef} />
          </section>
        </div>
      </main>
    </>
  );
};

export default InvoicePage;
