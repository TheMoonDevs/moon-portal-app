"use client";

import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useEffect } from "react";
import LinkList from "../LinkList/LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

export const CommonQuicklinks = ({ directoryId }: { directoryId: string }) => {
  const dispatch = useAppDispatch();
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
  return <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />;
};
