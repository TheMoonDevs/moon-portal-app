/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { Link as Quicklink } from "@prisma/client";
import { LinkActions } from "../LinkActions";
export const LineView = ({
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
      className="group cursor-pointer relative rounded-md py-2 px-2 w-full hover:bg-neutral-100 mt-2"
      onClick={() => handleLinkClick(link.id)}
    >
      <Link
        target="_blank"
        href={link.url}
        className="flex flex-row items-center justify-between"
      >
        <div className="flex flex-row items-center justify-start">
          <div className="bg-white rounded-full shadow-md min-w-[30px]">
            <img
              className="!h-[30px] !w-[30px] object-cover object-center rounded-full"
              src={link.logo}
              alt={link.title}
            />
          </div>
          <div className="flex flex-col px-4 overflow-hidden ">
            <p className="text-xs max-w-[70%] font-regular truncate ">
              {link.title.length > 100
                ? link.title.substring(0, 100) + " ..."
                : link.title}
            </p>
            <p className="text-[10px] opacity-[0.5] max-w-[50%] overflow-hidden truncate font-regular ">
              {link.url?.replace("https://", "")}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};
