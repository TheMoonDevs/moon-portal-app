/* eslint-disable @next/next/no-img-element */
import type { Link as Quicklink } from '@db/client';
import Link from 'next/link';
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
      className="group relative mt-2 w-full cursor-pointer rounded-md p-2 hover:bg-neutral-100"
      onClick={() => handleLinkClick(link.id)}
    >
      <Link
        target="_blank"
        href={link.url}
        className="flex flex-row items-center justify-between"
      >
        <div className="flex flex-row items-center justify-start">
          <div className="min-w-[30px] rounded-full bg-white shadow-md">
            {link.logo ? (
              <img
                className="!h-[30px] !w-[30px] rounded-full object-cover object-center"
                src={link.logo}
                alt={link.title}
              />
            ) : (
              <img
                className="!h-[30px] !w-[30px] rounded-full object-cover object-center"
                src="/logo.png"
                alt={link.title}
              />
            )}
          </div>
          <div className="flex flex-col overflow-hidden px-4">
            <p className="font-regular max-w-[70%] truncate text-xs">
              {link.title.length > 100
                ? link.title.substring(0, 100) + ' ...'
                : link.title}
            </p>
            <p className="font-regular max-w-[50%] overflow-hidden truncate text-[10px] opacity-50">
              {link.url?.replace('https://', '')}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};
