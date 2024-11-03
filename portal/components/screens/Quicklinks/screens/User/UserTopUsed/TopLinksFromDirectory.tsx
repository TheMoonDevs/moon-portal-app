"use client";

import { setAllQuicklinks } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Link, DirectoryList } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { CircularProgress } from "@mui/material";
import PaginationWrapper from "../../../global/PaginationWrapper";
import LinkList from "../../../LinkList/LinkList";

const NUMBER_OF_LINKS_TO_FETCH = 5;

const TopLinksFromDirectory = ({ directory }: { directory: DirectoryList }) => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(0);
  const isMounted = useRef(false);
  const [directoryLinks, setDirectoryLinks] = useState<Link[]>([]);
  const { currentView } = useAppSelector((state) => state.quicklinksUi);

  useEffect(() => {
    if (isMounted.current) return;
    if (directoryLinks.length > 0) setDirectoryLinks([]);
    isMounted.current = true;
  }, [dispatch]);

  const fetchTopLinksFromDirectory = async () => {
    try {
      const fetchedLinks = await QuicklinksSdk.getData(
        `/api/quicklinks/link?offset=${page}&limit=${NUMBER_OF_LINKS_TO_FETCH}&directoryId=${directory.id}`
      );
      const links: Link[] = fetchedLinks.data.links;
      const topLinks = links.sort((a, b) => b.clickCount - a.clickCount);

      return topLinks;
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const setItems = (topLinks: Link[] | undefined) => {
    if (!topLinks) return;
    console.log("prev", directoryLinks);
    console.log("new", topLinks);
    setDirectoryLinks((prevLinks) => {
      const combinedLinks = [...prevLinks, ...topLinks];

      // Filter out duplicates by 'id' (assuming links have a unique 'id')
      const uniqueLinks = combinedLinks.filter(
        (link, index, self) => index === self.findIndex((l) => l.id === link.id)
      );

      return uniqueLinks;
    });
  };

  return (
    <div className="my-6">
      <PaginationWrapper
        page={page}
        setPage={setPage}
        initialPageSize={NUMBER_OF_LINKS_TO_FETCH}
        fetchItems={fetchTopLinksFromDirectory}
        setItems={setItems}
        items={directoryLinks}
      >
        {(items, loadMore, loading, hasMore, displayCount, showLess) => {
          if (!items.length)
            return (
              <>
                {loading && page !== 0 && (
                  <div className="w-full items-center justify-center flex">
                    <CircularProgress />
                  </div>
                )}
              </>
            );
          return (
            <div className="flex flex-col bg-neutral-50 rounded-2xl p-2 py-3 gap-5 w-full transition-all max-sm:px-2">
              <div className="px-4 max-sm:px-0">
                <h1 className="mb-3 text-3xl font-semibold">
                  {directory.title}
                </h1>
                <LinkList
                  allQuicklinks={items}
                  isLoading={loading}
                  //   withView={currentView}
                />
                {loading && page !== 0 && (
                  <div className="w-full items-center justify-center flex">
                    <CircularProgress />
                  </div>
                )}
                {!loading && items.length > 0 && (
                  <>
                    {hasMore ? (
                      <button
                        className="w-full bg-neutral-200 hover:bg-neutral-100 rounded-xl p-2 font-bold text-neutral-600"
                        onClick={loadMore}
                      >
                        Show More
                      </button>
                    ) : (
                      displayCount !== NUMBER_OF_LINKS_TO_FETCH && (
                        <button
                          className="w-full bg-neutral-200 hover:bg-neutral-100 rounded-xl p-2 font-bold text-neutral-600"
                          onClick={showLess}
                        >
                          Show Less
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          );
        }}
      </PaginationWrapper>
    </div>
  );
};

export default TopLinksFromDirectory;
