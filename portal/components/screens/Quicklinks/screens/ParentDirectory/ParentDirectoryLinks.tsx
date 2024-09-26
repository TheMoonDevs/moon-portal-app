"use client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import LinkList from "../../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";

import TopUsedLink from "../Dashboard/TopUsedLink";
import { Link } from "@prisma/client";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { Box, styled, Tab, Tabs } from "@mui/material";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";
import QuicklinksTabs from "../../elements/Tabs";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import {
  setAllQuicklinks,
  setTopUsedLinksList,
} from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";

export const ParentDirectoryLinks = () => {
  const dispatch = useAppDispatch();
  //   const params = useSearchParams();
  //   const rootParentDirId = params?.get("id");

  const { allQuicklinks, topUsedLinksList } = useAppSelector(
    (state) => state.quicklinksLinks
  );
  const { activeDirectoryId } = useQuickLinkDirectory();
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
      dispatch(setTopUsedLinksList(sortedQuicklinks));

      setLoading(false);
      // } catch (error) {
      //   console.log(error);
      // }
    };
    getData();
  }, [activeDirectoryId, dispatch, setLoading]);

  return (
    <div className="mt-2">
      {/* <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
        <LinkList
          allQuicklinks={topUsedList}
          withView="thumbnail"
          isLoading={loading}
        />
      </TopUsedLink> */}
      <div className="flex justify-between items-center">
        <h1 className="py-[10px] font-bold text-xl">Links</h1>
        <ViewButtonGroup />
      </div>

      <div className="flex flex-col w-full pb-8">
        <div className="w-full">
          <QuicklinksTabs tabs={["All", "Top Used"]}>
            {(value) => {
              return (
                <>
                  {value === 0 && (
                    <LinkList
                      allQuicklinks={allQuicklinks}
                      isLoading={loading}
                    />
                  )}
                  {value === 1 && (
                    <LinkList
                      allQuicklinks={topUsedLinksList}
                      withView="thumbnail"
                      isLoading={loading}
                    />
                  )}
                </>
              );
            }}
          </QuicklinksTabs>
        </div>
        {/* <LinkFiltersHeader title={`View All in ${thisDirectory?.title}`} /> */}
      </div>
    </div>
  );
};
