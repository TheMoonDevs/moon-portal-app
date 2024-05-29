import Image from "next/image";
import Link from "next/link";
import { Link as Quicklink } from "@prisma/client";
import { LinkActions } from "../LinkActions";
export const CardView = ({
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
    <div className="group relative rounded-md max-w-[300px] border p-4 hover:bg-neutral-100 ">
      <div onClick={() => handleLinkClick(link.id)}>
        <Link
          href={link.url}
          target="_blank"
          className="flex flex-col overflow-hidden  gap-4"
        >
          <p className="text-lg w-4/5 font-semibold">
            {link.title.length > 50
              ? link.title.substring(0, 50) + " ..."
              : link.title}
          </p>
          <p className="text-sm w-4/5 ">
            {link.description.length > 200
              ? link.description.substring(0, 200) + " ..."
              : link.description}
          </p>
        </Link>
      </div>
      <div className="w-full mt-4 flex items-center gap-2">
        <Image
          className="!h-[30px] !object-cover rounded-full"
          src={(link as any).author?.avatar}
          alt=""
          width={30}
          height={30}
        />
        <p className="text-sm w-4/5 font-semibold">
          {(link as any).author?.name}
        </p>
      </div>
      <LinkActions
        link={link}
        handleFavoriteClick={handleFavoriteClick}
        handleDeleteLink={handleDeleteLink}
      />
    </div>
  );
};
