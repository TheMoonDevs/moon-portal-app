import { Link } from "@prisma/client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface IPaginationWrapperProps {
  items: Link[];
  setItems: (items: Link[] | undefined) => void;
  fetchItems: (page: number, pageSize: number) => Promise<Link[] | undefined>;
  initialPageSize?: number;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  children: (
    items: Link[],
    loadMore: () => void,
    loading: boolean,
    hasMore: boolean,
    displayCount: number,
    showLess: () => void
  ) => JSX.Element;
}
const PaginationWrapper = ({
  items,
  setItems,
  fetchItems,
  initialPageSize = 10,
  page = 1,
  setPage,
  children,
}: IPaginationWrapperProps) => {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [displayCount, setDisplayCount] = useState(initialPageSize); // Tracks how many items are displayed

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      const newItems = await fetchItems(page, initialPageSize);
      console.log(newItems);
      // If the response is empty, stop showing "Show More"
      if (newItems?.length === 0) {
        setHasMore(false);
      }

      if (newItems?.length && newItems?.length < initialPageSize) {
        setHasMore(false);
      }

      setItems(newItems);

      setLoading(false);
    };

    loadItems();
  }, [page]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prevPage: number) => prevPage + initialPageSize);
      setDisplayCount((prevCount) => prevCount + initialPageSize);
    }
  };

  // Show less items by reducing the display count but keeping all items in memory
  const showLess = () => {
    setDisplayCount(initialPageSize); // Show only the first page's worth of items
    setHasMore(true);
  };

  return (
    <div className="paginated-wrapper">
      {children(
        items.slice(0, displayCount),
        loadMore,
        loading,
        hasMore,
        displayCount,
        showLess
      )}
    </div>
  );
};

export default PaginationWrapper;
