"use client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import LinkList from "../../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  setAllQuicklinks,
  setTopUsedList,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import TopUsedLink from "../Dashboard/TopUsedLink";
import { Link } from "@prisma/client";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

export const ParentDirectoryLinks = () => {
  const dispatch = useAppDispatch();
  //   const params = useSearchParams();
  //   const rootParentDirId = params?.get("id");

  const { allQuicklinks, topUsedList, activeDirectoryId } = useAppSelector(
    (state) => state.quicklinks
  );
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  const { loading, setLoading } = useAsyncState();

  //Fetch link by department Id
  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      // try {
      const reponse = await QuicklinksSdk.getData(
        `/api/quicklinks/link?rootParentDirId=${activeDirectoryId}`
      );

      let quicklinks: Link[] = reponse.data.links;
      dispatch(setAllQuicklinks(quicklinks));

      const sortedQuicklinks = [...quicklinks]
        .sort((a, b) => b.clickCount - a.clickCount)
        .slice(0, 5);
      dispatch(setTopUsedList(sortedQuicklinks));

      setLoading(false);
      // } catch (error) {
      //   console.log(error);
      // }
    };
    getData();
  }, [activeDirectoryId, dispatch, setLoading]);

  return (
    <div className="mt-8">
      <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
        <LinkList
          allQuicklinks={topUsedList}
          withView="thumbnail"
          isLoading={loading}
        />
      </TopUsedLink>
      <div className="flex flex-col w-full">
        <LinkFiltersHeader title={`View All in ${thisDirectory?.title}`} />
        <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
      </div>
    </div>
  );
};
