import React from 'react';
import { IProfileData, IPublication } from './ProfileGrid';
import Image from 'next/image';
import { cn } from '@/lib/utils';
interface ProfileElementProps {
  data: IProfileData;
  borderColor?: string;
  direction?: 'rtl' | 'ltr' | 'distant';
  layout?: 'distant';
  position?: 'top' | 'center' | 'bottom';
  size?: 'small' | 'medium' | 'large';
  setPublications: React.Dispatch<
    React.SetStateAction<
      (IPublication & { name: string; avatar: string }) | undefined
    >
  >;
  setOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
}
const ProfileElement = React.forwardRef(
  (
    {
      data,
      direction = 'ltr',
      borderColor,
      position = 'center',
      className,
      layout,
      size = 'large',
      setPublications,
      setOpenDialog,
      ...props
    }: ProfileElementProps & React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    return (
      <div
        className={cn(
          'relative flex w-fit items-center justify-center',
          className,
        )}
      >
        <div
          className={cn(
            'relative gap-2',
            direction === 'rtl' && 'flex-row-reverse',
          )}
        >
          <div
            className={cn(
              'absolute -top-6 left-10 h-52 w-52 rounded-full border-4 border-blue-500 opacity-70',
              borderColor,
              size === 'small' && 'h-36 w-36',
              size === 'medium' && 'h-44 w-44',
              direction === 'rtl' && 'left-auto right-10',
            )}
          ></div>

          <div
            className={cn(
              'relative flex items-center gap-2',
              direction === 'rtl' && 'flex-row-reverse',
            )}
          >
            <div className="relative z-50 w-fit rounded-full bg-neutral-700/50 p-3 backdrop-blur-sm">
              <div className="rounded-full">
                <Image
                  className="aspect-square rounded-full object-cover"
                  src={data.avatar}
                  alt={data.name}
                  width={size === 'small' ? 100 : size === 'medium' ? 150 : 200}
                  height={
                    size === 'small' ? 100 : size === 'medium' ? 150 : 200
                  }
                />
              </div>
            </div>
            <ul className="z-50 w-full space-y-2">
              {data.publications.map((publication) => (
                <div
                  className={cn(
                    'group flex w-full cursor-pointer items-center gap-2',
                    direction === 'rtl' && 'flex-row-reverse justify-start',
                  )}
                  onClick={() => {
                    setPublications({
                      ...publication,
                      name: data.name,
                      avatar: data.avatar,
                    });
                    setOpenDialog(true);
                  }}
                >
                  <li
                    key={publication.title}
                    className={cn(
                      "after:contents-[''] relative text-sm font-light text-neutral-300 transition-all duration-200 before:mt-2 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:text-white hover:after:w-full",
                    )}
                  >
                    <p
                      className={cn(
                        'text-left text-xs',
                        direction === 'rtl' && 'text-right',
                      )}
                    >
                      {publication.title}
                    </p>
                  </li>
                  <span className="material-symbols-outlined icon_size !invisible !text-sm group-hover:!visible">
                    open_in_new
                  </span>
                </div>
              ))}
            </ul>
          </div>
          <div
            className={cn(
              'relative z-50 mt-4 flex w-full flex-col',
              direction === 'rtl' && 'right-0 items-end text-right',
              direction === 'ltr' && layout === 'distant' && '-ml-20',
              direction === 'rtl' && layout === 'distant' && 'ml-32',
            )}
          >
            <div>
              <p className="text-base">{data.experience}</p>
              <p
                className={cn(
                  'text-xs text-neutral-400',
                  direction === 'rtl' && layout === 'distant' && 'text-left',
                )}
              >
                {data.domain} {data.position}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ProfileElement;
