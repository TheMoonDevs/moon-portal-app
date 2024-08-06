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
    <div className="group relative rounded-md w-full sm:max-w-[300px] border p-4 hover:bg-neutral-100 cursor-pointer">
      <div onClick={() => handleLinkClick(link.id)}>
        <Link
          href={link.url}
          target="_blank"
          className="flex flex-col overflow-hidden  gap-4"
        >
          <div className="w-full h-40 relative mb-2 overflow-hidden rounded-t-md shadow">
            <Image
              src={link.image || link.logo}
              layout="fill"
              objectFit="cover"
              className="transition duration-500 ease-in-out transform group-hover:scale-105"
              alt={link.title}
            />
          </div>
          <p className="text-lg w-11/12 font-semibold">
            {link.title.length > 50
              ? link.title.substring(0, 50) + " ..."
              : link.title}
          </p>
          <p className="text-[14px] opacity-[0.5] text-center max-w-[250px] truncate font-regular ">
            {link.url?.replace("https://", "")}
          </p>
          <p className="text-sm">
            {link.description.length > 100
              ? link.description.substring(0, 100) + " ..."
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
