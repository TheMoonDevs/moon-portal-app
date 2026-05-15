'use client';
import { useAppSelector } from '@/utils/redux/store';

import LinkList from '../../LinkList/LinkList';
import { ViewButtonGroup } from '../../LinkList/ViewButtonGroup';

export const SubDirectoryLinks = ({ loading }: { loading: boolean }) => {
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);

  if (allQuicklinks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="py-[10px] text-xl font-bold">Links</h1>
        <ViewButtonGroup />
      </div>
      <div className="mt-3 flex w-full flex-col">
        {/* <LinkFiltersHeader title={thisDirectory?.title} /> */}
        <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
      </div>
    </div>
  );
};
