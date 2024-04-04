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
import TopUsedLink from "../QuicklinksDashboard/TopUsedLink";
import { Link } from "@prisma/client";
import useAsyncState from "@/utils/hooks/useAsyncState";

export const DepartmentLinks = () => {
  const params = useSearchParams();
  const departmentId = params?.get("departmentId");
  const dispatch = useAppDispatch();
  const { allQuicklinks, topUsedList } = useAppSelector(
    (state) => state.quicklinks
  );
  const { loading, setLoading, error, setError } = useAsyncState();
  //Fetch link by department Id
  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      // try {
      const reponse = await QuicklinksSdk.getData(
        `/api/quicklinks/link?departmentId=${departmentId}`
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
  }, [departmentId, dispatch, setLoading]);

  return (
    <div>
      <TopUsedLink>
        <LinkList
          allQuicklinks={topUsedList}
          withView="group"
          isLoading={loading}
        />
      </TopUsedLink>
      <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
    </div>
  );
};
