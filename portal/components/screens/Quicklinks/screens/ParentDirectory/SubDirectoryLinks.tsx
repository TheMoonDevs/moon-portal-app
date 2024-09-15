"use client";

import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect } from "react";
import LinkList from "../../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";

export const SubDirectoryLinks = () => {
  const dispatch = useAppDispatch();
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const { activeDirectoryId } = useQuickLinkDirectory();
  const { thisDirectory, parentDirecotry } =
    useQuickLinkDirs(activeDirectoryId);
  const { loading, setLoading, error, setError } = useAsyncState();
  useEffect(() => {
    if (!activeDirectoryId) return;
    const getData = async () => {
      setLoading(true);
      try {
        // console.log("sent", activeDirectoryId);
        const allQuicklinks = await QuicklinksSdk.getData(
          `/api/quicklinks/link?directoryId=${activeDirectoryId}`
        );
        // console.log("received", allQuicklinks);
        dispatch(setAllQuicklinks(allQuicklinks.data.links));

        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    };

    getData();
  }, [activeDirectoryId, dispatch, setLoading]);

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
