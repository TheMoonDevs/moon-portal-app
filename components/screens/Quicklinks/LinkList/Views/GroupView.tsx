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
        className="flex flex-col justify-between items-center gap-4"
      >
        <div className="">
          <Image
            className="!h-[100px] !object-cover rounded-full"
            src={link.logo}
            alt={link.title}
            width={100}
            height={100}
          />
        </div>
        <p className="text-sm text-center w-4/5 font-semibold">
          {link.title.length > 50
            ? link.title.substring(0, 50) + " ..."
            : link.title}
        </p>
      </Link>
    </div>
  );
};
