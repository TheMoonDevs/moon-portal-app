import Image from "next/image";
import Link from "next/link";
import { Link as Quicklink } from "@prisma/client";
export const GroupView = ({
  link,
  handleLinkClick,
}: {
  link: Quicklink;
  handleLinkClick: (linkId: string) => void;
}) => {
  return (
    <div onClick={() => handleLinkClick(link.id)}>
      <Link
        href={link.url}
        target="_blank"
        className="flex p-4 flex-col justify-between items-center gap-2 "
      >
        <div className="bg-white rounded-full p-4 shadow-md ">
          <Image
            className="!h-[40px] !w-[40px] !object-cover rounded-full"
            src={link.logo}
            alt={link.title}
            width={100}
            height={100}
          />
        </div>
        <p className="text-xs text-center max-w-[60px] truncate font-regular ">
          {link.title.length > 50
            ? link.title.substring(0, 50) + " ..."
            : link.title}
        </p>
      </Link>
    </div>
  );
};
