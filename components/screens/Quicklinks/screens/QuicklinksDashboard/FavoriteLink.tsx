"use client";
import { useEffect } from "react";
import LinkList from "../../LinkList/LinkList";
import { setFavoriteList } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useUser } from "@/utils/hooks/useUser";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { USERLINKTYPE } from "@prisma/client";
import { ViewButtonGroup } from "../../LinkList/ViewButtonGroup";
import useAsyncState from "@/utils/hooks/useAsyncState";

export default function FavoriteLink() {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { favoriteList } = useAppSelector((state) => state.quicklinks);

  useEffect(() => {
    if (!user?.id) return;

    const getFavoriteLinks = async () => {
      setLoading(true);
      try {
        const favoriteLinksData = await QuicklinksSdk.getData(
          `/api/quicklinks/link/user-link?userId=${user?.id}&linkType=${USERLINKTYPE.FAVORITED}`
        );

        dispatch(setFavoriteList(favoriteLinksData));
        setLoading(false);
      } catch (e) {
        console.log(e);
      }
    };

    getFavoriteLinks();
  }, [dispatch, user?.id, setLoading]);

  return (
    <div className="bg-gray-100 p-8 rounded-sm">
      <h2 className="uppercase tracking-[0.5rem] text-base font-normal text-gray-500">
        Added To My List
      </h2>
      <LinkList allQuicklinks={favoriteList} isLoading={loading} />
    </div>
  );
}
