'use client';

import { Button, CircularProgress } from '@mui/material';
import { Link as Quicklink } from '@prisma/client';
import { SearchOff } from '@mui/icons-material';
import { ViewButtonGroup } from './ViewButtonGroup';
import { LinkItem } from './LinkItem';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { setIsCreateLinkModalOpen } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import Image from 'next/image';
import { cn } from '@/app/lib/utils';

export enum VIEW {
  list = 'list',
  group = 'widget',
  thumbnail = 'thumbnail',
  line = 'line',
}

export type withView = 'all' | 'widget' | 'list' | 'thumbnail' | 'line';

export default function LinkList({
  allQuicklinks,
  withView = 'all',
  isLoading,
  inSearchBar,
}: {
  allQuicklinks?: Quicklink[];
  withView?: withView;
  isLoading?: boolean;
  inSearchBar?: boolean;
}) {
  const { currentView } = useAppSelector((state) => state.quicklinksUi);
  const dispatch = useAppDispatch();
  return (
    <>
      <div className={`w-full ${inSearchBar ? 'overflow-hidden' : ''}`}>
        {allQuicklinks?.length === 0 && isLoading && (
          <div className="flex w-full items-center justify-center">
            <CircularProgress color="inherit" />
          </div>
        )}

        {allQuicklinks?.length === 0 && !isLoading ? (
          !inSearchBar ? (
            <div className="flex h-[500px] w-full flex-col items-center justify-center">
              <div className="flex items-center justify-center">
                <Image
                  className="rounded-full object-cover"
                  src="/images/nothing-2.png"
                  alt="No data"
                  width={300}
                  height={300}
                />
              </div>
              <div>
                <h1 className="text-lg text-gray-400">
                  No Quicklink was found!
                </h1>
              </div>
              <div className="flex items-center gap-5">
                <h1 className="text-base text-gray-400">
                  Press{' '}
                  <span className="border-b-2 border-dashed border-blue-500 text-sm font-semibold text-blue-500">
                    Ctrl + V
                  </span>{' '}
                  to add one
                </h1>
              </div>
            </div>
          ) : (
            <div className="flex h-[250px] w-full flex-col items-center justify-center">
              <SearchOff sx={{ fontSize: 60 }} className="text-red-400" />
              <h1 className="text-lg text-gray-400">No Quicklink was found!</h1>
            </div>
          )
        ) : (
          <div
            className={cn(
              'py-4',
              currentView === VIEW.thumbnail &&
                'flex flex-wrap items-center gap-4 max-sm:justify-center',
              currentView === VIEW.group &&
                'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4',
            )}
          >
            {allQuicklinks?.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                withView={withView}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
