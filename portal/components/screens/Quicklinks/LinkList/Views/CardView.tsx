import Image from 'next/image';
import Link from 'next/link';
import { Link as Quicklink } from '@prisma/client';
import { LinkActions } from '../LinkActions';
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
    <div className="group relative cursor-pointer rounded-md border p-4 hover:bg-neutral-100">
      <div onClick={() => handleLinkClick(link.id)}>
        <Link
          href={link.url}
          target="_blank"
          className="flex flex-col gap-4 overflow-hidden"
        >
          <div className="relative mb-2 h-40 w-full overflow-hidden rounded-t-md shadow">
            {link.image || link.logo ? (
              <Image
                src={link.image! || link.logo!}
                layout="fill"
                objectFit="cover"
                className="transform transition duration-500 ease-in-out group-hover:scale-105"
                alt={link.title}
              />
            ) : (
              <Image
                src="/logo/logo.png"
                layout="fill"
                objectFit="cover"
                className="transform transition duration-500 ease-in-out group-hover:scale-105"
                alt=""
              />
            )}
          </div>
          <p className="w-11/12 text-lg font-semibold">
            {link.title.length > 50
              ? link.title.substring(0, 50) + ' ...'
              : link.title}
          </p>
          <p className="font-regular max-w-[250px] truncate text-[14px] opacity-[0.5]">
            {link.url?.replace('https://', '')}
          </p>
          <p className="text-sm">
            {link.description.length > 100
              ? link.description.substring(0, 100) + ' ...'
              : link.description}
          </p>
        </Link>
      </div>
      <div className="mt-4 flex w-full items-center gap-2">
        <Image
          className="!h-[30px] rounded-full !object-cover"
          src={(link as any).author?.avatar}
          alt=""
          width={30}
          height={30}
        />
        <p className="w-4/5 text-sm font-semibold">
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
