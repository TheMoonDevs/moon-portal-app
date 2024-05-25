"use client";

import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect } from "react";
import LinkList from "../../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";

export const DepartmentLinksByDirId = ({
  directoryId,
}: {
  directoryId: string;
}) => {
  const dispatch = useAppDispatch();
  const { allQuicklinks } = useAppSelector((state) => state.quicklinks);
  const { loading, setLoading, error, setError } = useAsyncState();
  useEffect(() => {
    const getData = async () => {
      setLoading(true);

      try {
        const allQuicklinks = await QuicklinksSdk.getData(
          `/api/quicklinks/link?directoryId=${directoryId}`
        );
        dispatch(setAllQuicklinks(allQuicklinks.data.links));

        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    };

    getData();
  }, [directoryId, dispatch, setLoading]);
  return (
    <div className="flex flex-col w-full">
      <LinkFiltersHeader />
      <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
    </div>
  );
};
