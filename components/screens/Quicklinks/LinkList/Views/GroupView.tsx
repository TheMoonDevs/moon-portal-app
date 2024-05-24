import Image from "next/image";
import Link from "next/link";
import { Link as Quicklink } from "@prisma/client";
import { LinkActions } from "../LinkActions";
export const GroupView = ({
  link,
  handleLinkClick,
  handleFavoriteClick,
  handleDeleteLink,
}: {
  link: Quicklink;
  handleLinkClick: (linkId: string) => void;
  handleFavoriteClick: (link: Quicklink) => void;
  handleDeleteLink: (linkId: string) => void;
}) => {
  return (
    <div
      className="group relative rounded-md hover:bg-neutral-100 "
      onClick={() => handleLinkClick(link.id)}
    >
      <Link
        href={link.url}
        target="_blank"
        className="flex p-4 flex-col justify-between items-center "
      >
        <div className="bg-white rounded-full p-4 shadow-md mb-3">
          <Image
            className="!h-[40px] !w-[40px] !object-cover rounded-full"
            src={link.logo}
            alt={link.title}
            width={100}
            height={100}
          />
        </div>
        <p className="text-xs text-center max-w-[80px] truncate font-regular ">
          {link.title.length > 50
            ? link.title.substring(0, 50) + " ..."
            : link.title}
        </p>
        <p className="text-[10px] opacity-[0.5] text-center max-w-[80px] truncate font-regular ">
          {link.url?.replace("https://", "")}
        </p>
      </Link>
      <LinkActions
        link={link}
        handleFavoriteClick={handleFavoriteClick}
        handleDeleteLink={handleDeleteLink}
      />
    </div>
  );
};
