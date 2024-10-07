"use client";

import useAsyncState from "@/utils/hooks/useAsyncState";
import { useUser } from "@/utils/hooks/useUser";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { UserLink, USERLINKTYPE } from "@prisma/client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { ViewButtonGroup } from "../../../LinkList/ViewButtonGroup";
import LinkList from "../../../LinkList/LinkList";
import { setTopUsedLinksList } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";

const UserTopUsedLinks = ({ withTitle }: { withTitle?: boolean }) => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { topUsedLinksList } = useAppSelector((state) => state.quicklinksLinks);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const getTopUsedLinks = async () => {
      if (topUsedLinksList.length > 0) dispatch(setTopUsedLinksList([]));

      setLoading(true);
      try {
        const topUsedLinksData: UserLink[] = await QuicklinksSdk.getData(
          `/api/quicklinks/link/user-link?userId=${user.id}&linkType=${USERLINKTYPE.TOPUSED}`
        );

        // console.log("topused", topUsedLinksData);
        dispatch(
          setTopUsedLinksList(
            topUsedLinksData.map((link) => (link as any).linkData)
          )
        );
        setLoading(false);
      } catch (e) {
        setLoading(false);
        console.log(e);
        return null;
      }
    };

    getTopUsedLinks();
  }, [dispatch, user?.id, setLoading, topUsedLinksList.length]);
  return (
    <div>
      <div className=" flex justify-between items-center">
        {withTitle && (
          <h1 className="py-[10px] font-bold text-xl flex gap-4 items-center">
            <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
              link
            </span>{" "}
            <span className="text-2xl font-bold flex items-center gap-4">
              Your Top Used Links
            </span>
          </h1>
        )}
        <ViewButtonGroup />
      </div>
      <LinkList
        allQuicklinks={topUsedLinksList}
        // withView="thumbnail"
        isLoading={loading}
      />
    </div>
  );
};

export default UserTopUsedLinks;
