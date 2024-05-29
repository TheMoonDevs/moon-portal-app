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
  );
};
