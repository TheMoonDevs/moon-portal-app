"use client";
import { useAppSelector } from "@/utils/redux/store";
import LinkList from "../../LinkList/LinkList";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";

export const SubDirectoryLinks = ({ loading }: { loading: boolean }) => {
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);

  if (allQuicklinks.length === 0) return null;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="py-[10px] font-bold text-xl">Links</h1>
        <ViewButtonGroup />
      </div>
      <div className="flex flex-col w-full mt-3">
        {/* <LinkFiltersHeader title={thisDirectory?.title} /> */}
        <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
      </div>
    </div>
  );
};
