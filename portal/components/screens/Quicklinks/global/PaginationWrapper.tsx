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
    hasMore: boolean
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

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      const newItems = await fetchItems(page, initialPageSize);
      console.log("newItems", newItems);

      // Dispatch the Redux action to update the items
      setItems(newItems);

      setLoading(false);
    };

    loadItems();
  }, [page]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prevPage: number) => prevPage + initialPageSize);
    }
  };

  return (
    <div className="paginated-wrapper">
      {children(items, loadMore, loading, hasMore)}
    </div>
  );
};

export default PaginationWrapper;
