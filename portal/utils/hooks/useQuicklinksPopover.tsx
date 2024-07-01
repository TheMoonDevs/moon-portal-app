import { setPopoverElementWithData } from "../redux/quicklinks/quicklinks.slice";
import { useAppDispatch, useAppSelector } from "../redux/store";

export const useQuicklinksPopover = () => {
  const { popoverElementWithData } = useAppSelector(
    (state) => state.quicklinks
  );
  const dispatch = useAppDispatch();
  const openEmojiSet = popoverElementWithData.anchorId === "emoji-set";
  const openFolderEditor = popoverElementWithData.anchorId === "edit-folder";
  const { data } = popoverElementWithData;

  const handleClose = () => {
    dispatch(
      setPopoverElementWithData({
        element: null,
        anchorId: null,
        data: null,
      })
    );
  };

  return {
    openEmojiSet,
    openFolderEditor,
    anchorElement: popoverElementWithData.element,
    data,
    handleClose,
  };
};
