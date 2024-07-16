"use client";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import Invoice from "./Invoice";
import InvoiceModal from "./InvoiceModal";
import InvoiceHeader from "./InvoiceHeader";
import { PortalSdk } from "@/utils/services/PortalSdk";

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

export interface InvoicePaymentData {
  cryptoPaymentInfo: {
    wallet_address: string;
  };
  bankPaymentInfo: {
    name: string;
    account_no: string;
    ifsc: string;
  };
}

const InvoicePage = () => {
  const [showInput, setShowInput] = useState<boolean>(false);
  const [dbPaymentInfo, setDBPaymentInfo] = useState<InvoicePaymentData | null>(
    null
  );
  const [showUpdateButton, setShowUpdateButton] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [dataLoad, setDataLoad] = useState<boolean>(false);
  const today = new Date(); // Get today"s date
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 7);

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceId: "",
    invoiceDate: today,
    dueDate: dueDate,
    paymentMethod: "bank",
    cryptoAddress: "",
    payingTo: "Subhakar Tikkireddy",
    companyName: "TheMoonDevs",
    bankDetails: {
      name: "",
      account: "",
      ifsc: "",
    },
  });

  const pdfTargetRef = useRef<HTMLElement | any>(null);

  const toggleInput = () => {
    setShowInput(!showInput);
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    let updatedData: InvoiceData;

    if (name.includes("bank")) {
      const field = name.split("-")[1];
      updatedData = {
        ...invoiceData,
        bankDetails: { ...invoiceData.bankDetails, [field]: value },
      };
    } else {
      updatedData = { ...invoiceData, [name]: value };
    }

    setInvoiceData(updatedData);
    checkIfPaymentInfoEdited(updatedData);
  };

  const checkIfPaymentInfoEdited = (currentData: InvoiceData) => {
    if (!dbPaymentInfo) return;

    const currentPaymentInfo = {
      cryptoPaymentInfo: {
        wallet_address: currentData.cryptoAddress,
      },
      bankPaymentInfo: {
        name: currentData.bankDetails.name,
        account_no: currentData.bankDetails.account,
        ifsc: currentData.bankDetails.ifsc,
      },
    };

    const isEdited = (
      Object.keys(currentPaymentInfo) as (keyof InvoicePaymentData)[]
    ).some((key) =>
      (
        Object.keys(
          currentPaymentInfo[key]
        ) as (keyof (typeof currentPaymentInfo)[typeof key])[]
      ).some(
        (subKey) =>
          currentPaymentInfo[key][subKey] !== dbPaymentInfo[key][subKey]
      )
    );

    setShowUpdateButton(isEdited);
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

  const fetchInvoicePaymentData = async () => {
    setDataLoad(true);
    try {
      const response = await PortalSdk.getData("/api/invoice", null);
      if (response && response) {
        setDBPaymentInfo(response.configData);
        setInvoiceData({
          ...invoiceData,
          cryptoAddress: response.configData.cryptoPaymentInfo.wallet_address,
          bankDetails: {
            name: response.configData.bankPaymentInfo.name,
            account: response.configData.bankPaymentInfo.account_no,
            ifsc: response.configData.bankPaymentInfo.ifsc,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching invoice payment data:", error);
    } finally {
      setDataLoad(false);
    }
  };

  useEffect(() => {
    fetchInvoicePaymentData();
  }, []);

  const handleUpdatePaymentInfo = async () => {
    setLoading(true);
    const data = {
      cryptoPaymentInfo: {
        wallet_address: invoiceData.cryptoAddress,
      },
      bankPaymentInfo: {
        name: invoiceData.bankDetails.name,
        account_no: invoiceData.bankDetails.account,
        ifsc: invoiceData.bankDetails.ifsc,
      },
    };

    try {
      const response = await PortalSdk.putData("/api/invoice", data);
      console.log("Update successful", response);
      if (response && response.configData) {
        setDBPaymentInfo(response.configData);
        setInvoiceData({
          ...invoiceData,
          cryptoAddress: response.configData.cryptoPaymentInfo.wallet_address,
          bankDetails: {
            name: response.configData.bankPaymentInfo.name,
            account: response.configData.bankPaymentInfo.account_no,
            ifsc: response.configData.bankPaymentInfo.ifsc,
          },
        });
      }
      setShowUpdateButton(false);
    } catch (error) {
      console.error("Error updating payment info", error);
    } finally {
      setLoading(false);
    }
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
          <div className="block md:hidden bg-[#F5F5EF] h-auto">
            {showInput && (
              <div className="overflow-y-auto h-full">
                <InvoiceModal
                  invoiceData={invoiceData}
                  handleInputChange={handleInputChange}
                  handleDateChange={handleDateChange}
                  handlePaymentMethodChange={handlePaymentMethodChange}
                  handleOwnerInfoChange={handleOwnerInfoChange}
                  handleUpdatePaymentInfo={handleUpdatePaymentInfo}
                  loading={loading}
                  showUpdateButton={showUpdateButton}
                  dataLoad={dataLoad}
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
                handleUpdatePaymentInfo={handleUpdatePaymentInfo}
                loading={loading}
                showUpdateButton={showUpdateButton}
                dataLoad={dataLoad}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default InvoicePage;
