import type { Link as Quicklink } from '@db/client';
import Image from 'next/image';
import Link from 'next/link';

import { LinkActions } from '../LinkActions';
export const ThumbnailView = ({
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
      className="group relative rounded-md hover:bg-neutral-100"
      onClick={() => handleLinkClick(link.id)}
    >
      <Link
        href={link.url}
        target="_blank"
        className="flex flex-col items-center justify-between p-4"
      >
        <div className="mb-3 rounded-full bg-white p-4 shadow-md">
          {link.logo && link.title ? (
            <Image
              className="!h-[40px] !w-[40px] rounded-full !object-cover"
              src={link.logo}
              alt={link.title}
              width={100}
              height={100}
            />
          ) : (
            <Image
              className="!h-[40px] !w-[40px] rounded-full !object-cover"
              src="/logo/logo.png"
              alt="Moon Portal Logo"
              width={100}
              height={100}
            />
          )}
        </div>
        <p className="font-regular max-w-[80px] truncate text-center text-xs">
          {link.title.length > 50
            ? link.title.substring(0, 50) + ' ...'
            : link.title}
        </p>
        <p className="font-regular max-w-[80px] truncate text-center text-[10px] opacity-50">
          {link.url?.replace('https://', '')}
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
