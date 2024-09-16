/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { Link as Quicklink } from "@prisma/client";
import { LinkActions } from "../LinkActions";
export const ListView = ({
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
    <div className="group relative rounded-md my-6 max-w-[700px]">
      <div>
        <div className="flex flex-row items-center justify-between mb-2">
          <div className="flex flex-row items-center justify-start">
            <div className="bg-white rounded-full shadow-md">
              <img
                className="h-[30px] w-[30px] object-cover object-center rounded-full"
                src={link.logo}
                alt={link.title}
              />
            </div>
            <div className="flex flex-col px-4">
              <p className="text-xs font-regular ">Like Site</p>
              <p className="text-[10px] opacity-[0.5] text-center max-w-[200px] truncate font-regular ">
                {link.url?.replace("https://", "")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={link.url}
          target="_blank"
          className="flex flex-col hover:underline"
          onClick={() => handleLinkClick(link.id)}
        >
          <p className="text-lg  font-semibold">
            {link.title.length > 100
              ? link.title.substring(0, 100) + " ..."
              : link.title}
          </p>
        </Link>

        <p className="text-sm mt-2">{link.description}</p>
      </div>
      <div className="flex flex-row  mr-[40px] mt-6">
        <img
          className="!h-[20px] !w-[20px] !object-cover rounded-full"
          src={(link as any).author?.avatar}
          alt=""
        />
        <p className="text-sm max-w-[300px] truncate font-semibold ml-2">
          Added By {(link as any).author?.name}
        </p>
      </div>
      <div className="w-full my-8 flex items-center gap-2">
        <div className="w-full flex-grow-1 h-[1px] bg-neutral-200"></div>
        {/* <p className="text-sm w-4/5 font-semibold">
          {new Date(link.).toLocaleDateString()}
          </p> */}
      </div>
      <LinkActions
        link={link}
        handleFavoriteClick={handleFavoriteClick}
        handleDeleteLink={handleDeleteLink}
      />
    </div>
  );
};
