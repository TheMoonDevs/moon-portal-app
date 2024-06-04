"use client";

import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect } from "react";
import LinkList from "../../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

export const SubDirectoryLinks = () => {
  const dispatch = useAppDispatch();
  const { allQuicklinks, activeDirectoryId } = useAppSelector(
    (state) => state.quicklinks
  );
  const { thisDirectory, parentDirecotry } =
    useQuickLinkDirs(activeDirectoryId);
  const { loading, setLoading, error, setError } = useAsyncState();
  useEffect(() => {
    const getData = async () => {
      setLoading(true);

      try {
        console.log("sent", activeDirectoryId);
        const allQuicklinks = await QuicklinksSdk.getData(
          `/api/quicklinks/link?directoryId=${activeDirectoryId}`
        );
        console.log("received", allQuicklinks);
        dispatch(setAllQuicklinks(allQuicklinks.data.links));

        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    };

    getData();
  }, [activeDirectoryId, dispatch, setLoading]);
  return (
    <div className="flex flex-col w-full mt-8">
      <LinkFiltersHeader title={thisDirectory?.title} />
      <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
    </div>
  );
};
