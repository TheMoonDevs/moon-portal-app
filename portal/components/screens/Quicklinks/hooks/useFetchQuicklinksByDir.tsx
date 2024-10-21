import {
  setAllQuicklinks,
  setTopUsedLinksList,
} from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect, useState } from "react";
import { useQuickLinkDirectory } from "./useQuickLinkDirectory";
import { Link } from "@prisma/client";

const useFetchQuicklinksByDir = ({
  isRootDirectory,
}: {
  isRootDirectory: boolean;
}) => {
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  const { activeDirectoryId } = useQuickLinkDirectory();

  useEffect(() => {
    if (!activeDirectoryId) return;
    const apiPath = isRootDirectory
      ? `/api/quicklinks/link?rootParentDirId=${activeDirectoryId}`
      : `/api/quicklinks/link?directoryId=${activeDirectoryId}`;
    const getData = async () => {
      setLoading(true);
      try {
        // console.log("sent", activeDirectoryId);
        const response = await QuicklinksSdk.getData(apiPath);

        let quicklinks: Link[] = response.data.links;
        dispatch(setAllQuicklinks(quicklinks));

        if (isRootDirectory) {
          const sortedQuicklinks = [...quicklinks]
            .sort((a, b) => b.clickCount - a.clickCount)
            .slice(0, 5);
          dispatch(setTopUsedLinksList(sortedQuicklinks));
        }

        setLoading(false);
      } catch (error) {
        console.log(error);
      }
    };

    getData();
  }, [activeDirectoryId, dispatch, isRootDirectory, setLoading]);

  return {
    loading,
  };
};

export default useFetchQuicklinksByDir;
