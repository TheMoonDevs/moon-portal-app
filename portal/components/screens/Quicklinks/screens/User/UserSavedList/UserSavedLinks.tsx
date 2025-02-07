"use client";

import useAsyncState from "@/utils/hooks/useAsyncState";
import { useUser } from "@/utils/hooks/useUser";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { UserLink, USERLINKTYPE } from "@prisma/client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import LinkList from "../../../LinkList/LinkList";
import { ViewButtonGroup } from "../../../LinkList/ViewButtonGroup";
import { setFavoriteLinksList } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";

const UserSavedLinks = () => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { favoriteLinksList } = useAppSelector(
    (state) => state.quicklinksLinks
  );

  useEffect(() => {
    if (!user?.id) return;

    const getFavoriteLinks = async () => {
      setLoading(true);
      try {
        const favoriteLinksData = await QuicklinksSdk.getData(
          `/api/quicklinks/link/user-link?userId=${user?.id}&linkType=${USERLINKTYPE.FAVORITED}`
        );

        dispatch(setFavoriteLinksList(favoriteLinksData));
        setLoading(false);
      } catch (e) {
        console.log(e);
      }
    };

    getFavoriteLinks();
  }, [dispatch, user?.id, setLoading]);
  return (
    <div>
      {/* <h1 className="text-3xl font-bold flex gap-4 items-center">
        <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
          list
        </span>
        <span>Saved Items</span>
      </h1> */}
      <div className="mt-8 flex justify-between items-center max-sm:mt-0">
        <h1 className="py-[10px] font-bold text-xl">Saved Links</h1>
        <ViewButtonGroup />
      </div>
      <LinkList
        allQuicklinks={favoriteLinksList}
        // withView="thumbnail"
        isLoading={loading}
      />
    </div>
  );
};

export default UserSavedLinks;
