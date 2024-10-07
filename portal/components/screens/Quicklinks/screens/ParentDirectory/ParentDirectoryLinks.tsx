"use client";

import LinkList from "../../LinkList/LinkList";
import { useAppSelector } from "@/utils/redux/store";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";
import QuicklinksTabs from "../../elements/Tabs";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

export const ParentDirectoryLinks = ({ loading }: { loading: boolean }) => {
  const { allQuicklinks, topUsedLinksList } = useAppSelector(
    (state) => state.quicklinksLinks
  );
  const { activeDirectoryId } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);

  return (
    <div className="mt-2">
      {/* <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
        <LinkList
          allQuicklinks={topUsedList}
          withView="thumbnail"
          isLoading={loading}
        />
      </TopUsedLink> */}
      <div className="flex justify-between items-center">
        <h1 className="py-[10px] font-bold text-xl">Links</h1>
        <ViewButtonGroup />
      </div>

      <div className="flex flex-col w-full pb-8">
        <div className="w-full">
          <QuicklinksTabs
            tabs={[
              `All in ${thisDirectory?.title}`,
              `Top Used in ${thisDirectory?.title}`,
            ]}
          >
            {(value) => {
              return (
                <>
                  {value === 0 && (
                    <LinkList
                      allQuicklinks={allQuicklinks}
                      isLoading={loading}
                    />
                  )}
                  {value === 1 && (
                    <LinkList
                      allQuicklinks={topUsedLinksList}
                      withView="thumbnail"
                      isLoading={loading}
                    />
                  )}
                </>
              );
            }}
          </QuicklinksTabs>
        </div>
        {/* <LinkFiltersHeader title={`View All in ${thisDirectory?.title}`} /> */}
      </div>
    </div>
  );
};
