import { APP_ROUTES } from "@/utils/constants/appInfo";
import Image from "next/image";
import Link from "next/link";

const InvoiceHeader = () => {
  return (
    <header>
      <div className="fixed left-0 right-0 top-0 z-10 bg-white flex flex-row gap-3 py-2 px-3 items-center justify-between border-b border-neutral-300 shadow-md md:pl-[1rem] h-14">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <Link href={APP_ROUTES.home} className="flex items-center">
            <Image
              src="/icon-192x192.png"
              width={30}
              height={30}
              alt="logo"
              className="w-8 aspect-square mr-2"
            />
            <h1 className="md:text-lg text-sm whitespace-nowrap cursor-pointer font-extrabold pr-3 mr-3 hover:text-gray-800 transition-colors duration-300">
              The Moon Devs
            </h1>
          </Link>
        </div>
      </div>
    </header>
  );
};
export default InvoiceHeader;
