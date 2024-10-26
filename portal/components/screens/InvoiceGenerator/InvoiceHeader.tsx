import { Tooltip } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import generatePDF from 'react-to-pdf';

import { APP_ROUTES } from '@/utils/constants/appInfo';

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
    document.body.style.overflow = 'visible'; // Override to avoid clipping in PDF

    generatePDF(pdfTargetRef, {
      method: 'open',
      filename: `invoice.pdf`,
      page: { margin: { top: 0, bottom: 0, left: 10, right: 0 } }, // Custom margins
    });

    document.body.style.overflow = originalOverflow; // Restore original overflow style
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-300 px-3 shadow-md md:px-6 md:pl-4">
      <Link href={APP_ROUTES.home} className="flex items-center">
        <Image
          src="/icon-192x192.png"
          width={30}
          height={30}
          alt="logo"
          className="mr-2 aspect-square w-8"
        />
        <h1 className="cursor-pointer text-lg font-extrabold transition-colors duration-300 hover:text-gray-800 md:text-xl">
          The Moon Devs
        </h1>
      </Link>

      <div className="flex items-center justify-center gap-2">
        <div>
          <Tooltip arrow title="Download Invoice">
            <button
              className="flex items-center gap-1 rounded-md border-neutral-800 px-2 py-1 text-xs hover:bg-neutral-100 md:gap-2 md:border"
              onClick={handleDownloadPDF}
            >
              <span className="material-symbols-outlined text-xs">
                download
              </span>
              <span className="hidden font-medium md:inline">
                Download as PDF
              </span>
            </button>
          </Tooltip>
        </div>

        <div>
          <Tooltip arrow title="Send as Email PDF">
            <button className="flex items-center gap-1 rounded-md border-neutral-800 px-2 py-1 text-xs hover:bg-neutral-100 md:gap-2 md:border">
              <span className="material-symbols-outlined text-xs">mail</span>
              <span className="hidden font-medium md:inline">Email PDF</span>
            </button>
          </Tooltip>
        </div>

        <div className="block md:hidden">
          <div
            className={
              'flex cursor-pointer items-center rounded-full p-1 transition-all duration-300 ease-in-out'
            }
            onClick={toggleInput}
          >
            {showInput ? (
              <span className="material-symbols-outlined !text-[1.2rem]">
                close
              </span>
            ) : (
              <span className="material-symbols-outlined !text-[1.2rem]">
                edit
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default InvoiceHeader;
