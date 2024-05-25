import { Link as Quicklink, USERLINKTYPE } from "@prisma/client";
import { VIEW, withView } from "./LinkList";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useUser } from "@/utils/hooks/useUser";
import { useCallback, useState } from "react";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import {
  deleteQuicklink,
  setToast,
  toggleFavorite,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { ToastSeverity } from "@/components/elements/Toast";
import { debounce } from "@/utils/helpers/functions";
import { Fade, Tooltip } from "@mui/material";
import { ThumbnailView } from "./Views/ThumbnailView";
import { ListView } from "./Views/ListView";
import { CardView } from "./Views/CardView";
import { LinkActions } from "./LinkActions";
import { LineView } from "./Views/LineView";

export const LinkItem = ({
  allQuicklinks,
  link,
  withView = "all",
  isLoading,
}: {
  link: Quicklink;
  allQuicklinks?: Quicklink[];
  withView?: withView;
  isLoading?: boolean;
}) => {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { currentView } = useAppSelector((state) => state.quicklinks);

  const handleLinkClick = async (linkId: string) => {
    if (!user?.id) {
      return;
    }
    try {
      const response = await QuicklinksSdk.createData(
        `/api/quicklinks/link/user-link`,
        {
          linkId: linkId,
          userId: user?.id,
          linkType: USERLINKTYPE.TOPUSED,
        }
      );
    } catch (error) {
      console.log(error);
    }
  };
  const handleFavoriteClick = useCallback(
    async (link: Quicklink) => {
      dispatch(toggleFavorite(link));
      try {
        if (!user?.id) {
          throw new Error("User not logged in");
        }
        const response = await QuicklinksSdk.createData(
          `/api/quicklinks/link/user-link`,
          {
            linkId: link.id,
            userId: user?.id,
            linkType: USERLINKTYPE.FAVORITED,
          }
        );
        if (response) {
          dispatch(
            setToast({
              toastMsg: response.statusText,
              toastSev: ToastSeverity.success,
            })
          );
        }
      } catch (error) {
        dispatch(
          setToast({
            toastMsg: "Something went wrong. Please try again.",
            toastSev: ToastSeverity.error,
          })
        );
        dispatch(toggleFavorite(link));
        console.log(error);
      }
    },
    [dispatch, user?.id]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedHandleFavoriteClick = useCallback(
    debounce(handleFavoriteClick, 300),
    [handleFavoriteClick]
  );

  const handleDeleteLink = async (linkId: string) => {
    try {
      const response = await QuicklinksSdk.deleteData(
        `/api/quicklinks/link?linkId=${linkId}`
      );
      dispatch(deleteQuicklink(linkId));
      dispatch(
        setToast({
          toastMsg: response.statusText || "Deleted successfully",
          toastSev: ToastSeverity.success,
        })
      );
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      console.log(error);
    }
  };

  const isViewList = currentView === VIEW.list;
  const isViewGroup = currentView === VIEW.group;
  const isViewThumbnail = currentView === VIEW.thumbnail;
  const isViewLine = currentView === VIEW.line;
  return (
    <Tooltip
      title={link.title}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 600 }}
      enterDelay={1000}
    >
      <>
        {(withView === "thumbnail" ||
          (isViewThumbnail && withView == "all")) && (
          <div className="group relative rounded-md hover:bg-neutral-100 ">
            <ThumbnailView
              link={link}
              handleLinkClick={handleLinkClick}
              handleFavoriteClick={debouncedHandleFavoriteClick}
              handleDeleteLink={handleDeleteLink}
            />
          </div>
        )}
        {(withView === "list" || (isViewList && withView == "all")) && (
          <ListView
            link={link}
            handleLinkClick={handleLinkClick}
            handleFavoriteClick={debouncedHandleFavoriteClick}
            handleDeleteLink={handleDeleteLink}
          />
        )}
        {(withView === "line" || (isViewLine && withView == "all")) && (
          <LineView
            link={link}
            handleLinkClick={handleLinkClick}
            handleFavoriteClick={debouncedHandleFavoriteClick}
            handleDeleteLink={handleDeleteLink}
          />
        )}
        {withView === "all" && isViewGroup && (
          <CardView
            link={link}
            handleLinkClick={handleLinkClick}
            handleFavoriteClick={debouncedHandleFavoriteClick}
            handleDeleteLink={handleDeleteLink}
          />
        )}
      </>
    </Tooltip>
  );
};
