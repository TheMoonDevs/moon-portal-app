'use client';

import type { Link } from '@db/client';
import { CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { setAllQuicklinks } from '@/utils/redux/quicklinks/slices/quicklinks.links.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import PaginationWrapper from '../../global/PaginationWrapper';
import QuicklinkHeaderWrapper from '../../global/QuicklinkHeaderWrapper';
import LinkList from '../../LinkList/LinkList';
const NUMBER_OF_LINKS_TO_FETCH = 10;
const TrendingLinks = () => {
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(0);
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) return;
    if (allQuicklinks.length > 0) dispatch(setAllQuicklinks([]));
    isMounted.current = true;
  }, [allQuicklinks.length, dispatch]);

  const fetchTrendingLinks = async () => {
    try {
      const fetchedLinks = await QuicklinksSdk.getData(
        `/api/quicklinks/link?offset=${page}&limit=${NUMBER_OF_LINKS_TO_FETCH}`,
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
    <div className="px-6 max-sm:px-2">
      <PaginationWrapper
        page={page}
        setPage={setPage}
        initialPageSize={NUMBER_OF_LINKS_TO_FETCH}
        fetchItems={fetchTrendingLinks}
        setItems={setItems}
        items={allQuicklinks}
      >
        {(items, loadMore, loading, hasMore, displayCount, showLess) => (
          <div className="mt-4 flex w-full flex-col gap-5 transition-all max-sm:mt-0">
            <QuicklinkHeaderWrapper
              title="Trending"
              icon="trending_up"
              type="link"
            />
            <div className="mb-10 pl-4 max-sm:pl-0">
              <LinkList allQuicklinks={items} isLoading={loading} />
              {loading && page !== 0 && (
                <div className="flex w-full items-center justify-center">
                  <CircularProgress />
                </div>
              )}
              {!loading && (
                <>
                  {hasMore ? (
                    <button
                      className="w-full rounded-xl bg-neutral-200 p-2 font-bold text-neutral-600 hover:bg-neutral-100"
                      onClick={loadMore}
                    >
                      Show More
                    </button>
                  ) : (
                    displayCount !== NUMBER_OF_LINKS_TO_FETCH && (
                      <button
                        className="w-full rounded-xl bg-neutral-200 p-2 font-bold text-neutral-600 hover:bg-neutral-100"
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
        )}
      </PaginationWrapper>
    </div>
  );
};

export default TrendingLinks;
