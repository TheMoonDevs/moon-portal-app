'use client';

import LinkList from "../../LinkList/LinkList";
import { useAppSelector } from "@/utils/redux/store";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";
import QuicklinksTabs from "../../elements/Tabs";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { Link } from "@prisma/client";


export const ParentDirectoryLinks = ({ loading }: { loading: boolean }) => {
  const { allQuicklinks, topUsedLinksList } = useAppSelector(
    (state) => state.quicklinksLinks,
  );
  const { activeDirectoryId } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);

  const filterLinks = (
    searchQuery: string | undefined,
    links: Link[]
  ): Link[] => {
    if (!searchQuery) return allQuicklinks;
    return links.filter((link) =>
      link.title.toLowerCase().includes(searchQuery)
    );
  };

  return (
    <div className="mt-2">
      {/* <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
        <LinkList
          allQuicklinks={topUsedList}
          withView="thumbnail"
          isLoading={loading}
        />
      </TopUsedLink> */}
      <div className="flex items-center justify-between">
        <h1 className="py-[10px] text-xl font-bold">Links</h1>
        <ViewButtonGroup />
      </div>

      <div className="flex w-full flex-col pb-8">
        <div className="w-full">
          <QuicklinksTabs
            tabs={[
              `All in ${thisDirectory?.title}`,
              `Top Used in ${thisDirectory?.title}`,
            ]}
            isParentDir={true}
          >
            {(value, searchQuery) => {
              return (
                <>
                  {value === 0 && (
                    <LinkList
                      allQuicklinks={filterLinks(searchQuery, allQuicklinks)}
                      isLoading={loading}
                    />
                  )}
                  {value === 1 && (
                    <LinkList
                      allQuicklinks={filterLinks(searchQuery, topUsedLinksList)}
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
