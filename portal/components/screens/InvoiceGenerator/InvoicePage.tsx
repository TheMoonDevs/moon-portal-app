"use client";
import { useState } from "react";
import Invoice from "./Invoice";
import { Button } from "@mui/material";

import InvoiceModal from "./InvoiceModel";
import { Edit, X } from "lucide-react";

const InvoicePage = () => {
  const [showInput, setShowInput] = useState(false);

  const toggleInput = () => {
    setShowInput(!showInput);
  };

  return (
    <div className="flex flex-col md:flex-row w-full  h-full ">
      <div className="block md:hidden ">{showInput && <InvoiceModal />}</div>
      <section className="w-full md:w-1/2 p-4">
        <div className="hidden md:block overflow-y-auto mb-10     rounded-lg">
          <InvoiceModal />
        </div>
      </section>
      <section className="w-full md:w-1/2 p-4 border-dashed border mb-14  overflow-y-auto  shadow-lg rounded-lg">
        <Invoice />
      </section>
      <div className="block md:hidden fixed top-2 right-3 z-10">
        <div
          className={
            "p-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out  "
          }
          onClick={toggleInput}
        >
          {showInput ? <X color="red" /> : <Edit color="gray" />}
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
