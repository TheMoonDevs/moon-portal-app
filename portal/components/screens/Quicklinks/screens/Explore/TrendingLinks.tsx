"use client";

import { setAllQuicklinks } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Link } from "@prisma/client";
import { useState } from "react";
import PaginationWrapper from "../../global/PaginationWrapper";
import LinkList from "../../LinkList/LinkList";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { CircularProgress } from "@mui/material";
const NUMBER_OF_LINKS_TO_FETCH = 10;
const TrendingLinks = () => {
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(0);
  const fetchTrendingLinks = async () => {
    try {
      const fetchedLinks = await QuicklinksSdk.getData(
        `/api/quicklinks/link?offset=${page}&limit=${NUMBER_OF_LINKS_TO_FETCH}`
      );
      const links: Link[] = fetchedLinks.data.links;
      const trendingLinks = links.sort((a, b) => b.clickCount - a.clickCount);

      return trendingLinks;
    } catch (error) {
      console.log(error);
    }
  };

  const setItems = (trendingLinks: Link[] | undefined) => {
    if (!trendingLinks) return;
    dispatch(setAllQuicklinks([...allQuicklinks, ...trendingLinks]));
  };

  return (
    <div className="px-6">
      <PaginationWrapper
        page={page}
        setPage={setPage}
        initialPageSize={NUMBER_OF_LINKS_TO_FETCH}
        fetchItems={fetchTrendingLinks}
        setItems={setItems}
        items={allQuicklinks}
      >
        {(items, loadMore, loading, hasMore) => (
          <div className="flex flex-col gap-5 w-full mt-4">
            <QuicklinkHeaderWrapper
              title="Trending"
              icon="trending_up"
              type="link"
            />
            <div className="pl-4 mb-10">
              <LinkList allQuicklinks={items} isLoading={loading} />
              {loading && page !== 0 && (
                <div className="w-full items-center justify-center flex">
                  <CircularProgress />
                </div>
              )}
              {hasMore && !loading && (
                <button
                  className="w-full bg-neutral-200 hover:bg-neutral-100 rounded-xl p-2 font-bold text-neutral-600"
                  onClick={loadMore}
                >
                  Show More
                </button>
              )}
            </div>
          </div>
        )}
      </PaginationWrapper>
    </div>
  );
};

export default TrendingLinks;
