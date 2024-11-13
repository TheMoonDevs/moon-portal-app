/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';
import Link from 'next/link';
import { Link as Quicklink } from '@prisma/client';
import { LinkActions } from '../LinkActions';
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
    <div className="group relative w-full rounded-md">
      <div>
        <div className="mb-2 flex flex-row items-center justify-between">
          <div className="flex flex-row items-center justify-start">
            <div className="rounded-full bg-white shadow-md">
              {link.logo ? (
                <img
                  className="h-[30px] w-[30px] rounded-full object-cover object-center"
                  src={link.logo}
                  alt={link.title}
                />
              ) : (
                <Image
                  className="!h-[30px] !w-[30px] rounded-full object-cover object-center"
                  src="/logo/logo.png"
                  width={100}
                  height={100}
                  alt={link.title}
                />
              )}
            </div>
            <div className="flex flex-col px-4">
              <p className="font-regular text-xs">Like Site</p>
              <p className="font-regular max-w-[200px] truncate text-center text-[10px] opacity-[0.5]">
                {link.url?.replace('https://', '')}
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
          <p className="text-lg font-semibold">
            {link.title.length > 100
              ? link.title.substring(0, 100) + ' ...'
              : link.title}
          </p>
        </Link>

        <p className="mt-2 text-sm">{link.description}</p>
      </div>
      <div className="mr-[40px] mt-6 flex flex-row">
        <img
          className="!h-[20px] !w-[20px] rounded-full !object-cover"
          src={(link as any).author?.avatar}
          alt=""
        />
        <p className="ml-2 max-w-[300px] truncate text-sm font-semibold">
          Added By {(link as any).author?.name}
        </p>
      </div>
      <div className="my-8 flex w-full items-center gap-2">
        <div className="flex-grow-1 h-[1px] w-full bg-neutral-200"></div>
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
