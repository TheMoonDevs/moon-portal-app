import { Tooltip } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import generatePDF from "react-to-pdf";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { Edit, X } from "lucide-react";

interface InvoiceHeaderProps {
  pdfTargetRef: React.MutableRefObject<HTMLElement>;
  toggleInput: () => void;
  showInput: boolean;
}

const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  pdfTargetRef,
  toggleInput,
  showInput,
}) => {
  const handleDownloadPDF = () => {
    const originalOverflow = document.body.style.overflow; // Save original overflow style
    document.body.style.overflow = "visible"; // Override to avoid clipping in PDF

    generatePDF(pdfTargetRef, {
      method: "open",
      filename: `invoice.pdf`,
      page: { margin: { top: 0, bottom:0, left: 10, right: 0 } }, // Custom margins
    });

    document.body.style.overflow = originalOverflow; // Restore original overflow style
  };

  return (
    <header className="border-b border-neutral-300 shadow-md md:pl-[1rem] h-14 flex items-center justify-between px-3 md:px-6">
      <Link href={APP_ROUTES.home} className="flex items-center">
        <Image
          src="/icon-192x192.png"
          width={30}
          height={30}
          alt="logo"
          className="w-8 aspect-square mr-2"
        />
        <h1 className="text-lg font-extrabold md:text-xl cursor-pointer hover:text-gray-800 transition-colors duration-300">
          The Moon Devs
        </h1>
      </Link>

      <div className="flex justify-center items-center gap-2">
        <div>
          <Tooltip arrow title="Download Invoice">
            <button
              className="flex items-center gap-1 md:gap-2 md:border border-neutral-800 hover:bg-neutral-100 rounded-md px-2  py-1  text-xs"
              onClick={handleDownloadPDF}
            >
              <span className="material-symbols-outlined text-xs">
                download
              </span>
              <span className="hidden md:inline font-serif font-medium">
                Download as PDF
              </span>
            </button>
          </Tooltip>
        </div>

        <div>
          <Tooltip arrow title="Send as Email PDF">
            <button className="flex items-center gap-1 md:gap-2 md:border border-neutral-800 hover:bg-neutral-100 rounded-md px-2  py-1  text-xs">
              <span className="material-symbols-outlined text-xs">mail</span>
              <span className="hidden md:inline font-serif font-medium">
                Send as PDF
              </span>
            </button>
          </Tooltip>
        </div>

        <div className="block md:hidden">
          <div
            className={
              "p-1 rounded-full cursor-pointer transition-all duration-300 ease-in-out"
            }
            onClick={toggleInput}
          >
            {showInput ? (
              <X className="text-red-500 text-xs" />
            ) : (
              <Edit className="text-gray-800 text-xs" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default InvoiceHeader;
