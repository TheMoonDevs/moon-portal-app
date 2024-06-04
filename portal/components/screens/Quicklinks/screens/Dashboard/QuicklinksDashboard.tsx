"use client";

import { useEffect } from "react";
import FavoriteLink from "./FavoriteLink";
import TopUsedLink from "./TopUsedLink";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useDispatch } from "react-redux";
import { setTopUsedList } from "@/utils/redux/quicklinks/quicklinks.slice";
import { USERLINKTYPE, UserLink } from "@prisma/client";
import { useUser } from "@/utils/hooks/useUser";
import useAsyncState from "@/utils/hooks/useAsyncState";
import LinkList from "../../LinkList/LinkList";
import { useAppSelector } from "@/utils/redux/store";
import { Skeleton } from "@mui/material";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";

export const QuicklinksDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { topUsedList } = useAppSelector((state) => state.quicklinks);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const getTopUsedLinks = async () => {
      setLoading(true);
      try {
        const topUsedLinksData: UserLink[] = await QuicklinksSdk.getData(
          `/api/quicklinks/link/user-link?userId=${user.id}&linkType=${USERLINKTYPE.TOPUSED}`
        );

        console.log("topused", topUsedLinksData);
        dispatch(
          setTopUsedList(topUsedLinksData.map((link) => (link as any).linkData))
        );
        setLoading(false);
      } catch (e) {
        console.log(e);
        return null;
      }
    };

    getTopUsedLinks();
  }, [dispatch, user?.id, setLoading]);

  return (
    <>
      <QuicklinkHeaderWrapper>
        <div>
          {user ? (
            <h1 className="text-3xl pb-2">
              {user?.name?.split(" ")[0] || user?.username}&apos;s Dashboard
            </h1>
          ) : (
            <Skeleton width="100%" height="3rem" animation="wave" />
          )}
          <span className="text-sm text-neutral-400 block">
            Quicklinks is the fastest way to work collaboratively
          </span>
        </div>
      </QuicklinkHeaderWrapper>
      <div className="mt-10 w-full">
        <TopUsedLink>
          <LinkList
            allQuicklinks={topUsedList}
            withView="thumbnail"
            isLoading={loading}
          />
        </TopUsedLink>
        <FavoriteLink />
      </div>
    </>
  );
};
