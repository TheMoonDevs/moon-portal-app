"use client";

import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect } from "react";
import LinkList from "../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { LinkFiltersHeader } from "../LinkList/LinkFiltersHeader";
import { useSearchParams } from "next/navigation";
import { useQuickLinkDirectory } from "../global/QuicklinksSidebar/useQuickLinkDirectory";

export const CommonQuicklinks = ({
  directorySlug,
}: {
  directorySlug: string;
}) => {
  const dispatch = useAppDispatch();
  const params = useSearchParams();
  const directoryId = params?.get("id");
  const { parentDirs, directories } = useQuickLinkDirectory();
  const thisDirectory =
    parentDirs.find((dir) => dir.id === directoryId) ||
    directories.find((dir) => dir.id === directoryId) ||
    null;
  const parentDirecotry =
    thisDirectory && "parentDirId" in thisDirectory
      ? parentDirs.find((dir) => dir.id === thisDirectory?.parentDirId)
      : null;

  const { allQuicklinks } = useAppSelector((state) => state.quicklinks);
  const { loading, setLoading, error, setError } = useAsyncState();
  useEffect(() => {
    setLoading(true);
    const getData = async () => {
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
      <LinkFiltersHeader title={thisDirectory?.title} />
      <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
    </div>
  );
};
