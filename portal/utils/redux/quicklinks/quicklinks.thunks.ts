import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { DirectoryList, ROOTTYPE } from "@prisma/client";
import { createAsyncThunk } from "@reduxjs/toolkit";

import { ToastSeverity } from "@/components/elements/Toast";
import {
  addNewDirectory,
  clearThisDirectoryFromOtherLists,
  setNewParentDir,
  updateDirectory,
} from "./slices/quicklinks.directory.slice";
import { setModal, setToast , setIsLoading} from "./slices/quicklinks.ui.slice";

export const handleDeleteDirectory = createAsyncThunk(
  "directory/deleteDirectory",
  async (
    {
      directory,
      parentId,
    }: { directory: DirectoryList; parentId: string | null },
    { dispatch, rejectWithValue }
  ) => {
    // let apiPath = "/api/quicklinks/directory";
    // if (!parentId) {
    //   apiPath = " /api/quicklinks/parent-directory";
    // }
    const updatedDirectory = {
      ...directory,
      isArchive: true,
    };

    try {
      const response = await QuicklinksSdk.updateData(
        "/api/quicklinks/directory-list",
        updatedDirectory
      );
      dispatch(updateDirectory(updatedDirectory));
      dispatch(clearThisDirectoryFromOtherLists(updatedDirectory));
      dispatch(
        setToast({ toastMsg: "Done!", toastSev: ToastSeverity.success })
      );
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
      dispatch(updateDirectory(directory));
      console.log(error);
    }
  }
);

// Thunk to handle directory update
export const handleDirectoryUpdate = createAsyncThunk(
  "quicklinks/handleDirectoryUpdate",
  async (
    {
      directory,
      parentId,
      updateInfo,
    }: {
      directory: DirectoryList;
      parentId: string | null;
      updateInfo: Partial<DirectoryList>;
    },
    { dispatch, getState }
  ) => {
    const updatedDirectory = { ...directory, ...updateInfo };
    // let apiPath = parentId
    //   ? `/api/quicklinks/directory`
    //   : `/api/quicklinks/parent-directory`;
    dispatch(setIsLoading(true))

    try {
      // Optimistic update in Redux state
      dispatch(updateDirectory(updatedDirectory));

      const response = await QuicklinksSdk.updateData(
        "/api/quicklinks/directory-list",
        updatedDirectory
      );

      // Show success toast
      dispatch(
        setToast({ toastMsg: "Done!", toastSev: ToastSeverity.success })
      );
      dispatch(setModal({ type: null, data: null }));

      // Revalidate root directories after the update
      return response.data.directory; // Can be used in further processing if needed
    } catch (error) {
      // Revert optimistic update in case of failure
      dispatch(updateDirectory(directory));

      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );

      throw error;
    }finally{
      dispatch(setIsLoading(false))
    }
  }
);

// Thunk to add a new child directory
export const handleAddChildDirectory = createAsyncThunk(
  "quicklinks/handleAddChildDirectory",
  async (
    {
      parentDirId,
      rootType,
      title,
    }: {
      parentDirId: string | null;
      rootType: ROOTTYPE;
      title?: string;
    },
    { dispatch }
  ) => {
    // let apiPath = parentDirId
    //   ? `/api/quicklinks/directory`
    //   : `/api/quicklinks/parent-directory`;
    dispatch(setIsLoading(true))

    const newDirectory: Partial<DirectoryList> = {
      title: title || `Untitled`,
      logo: ``,
      slug: title?.toLowerCase().replace(/ /g, "-") || `untitled`,
      ...(parentDirId && { parentDirId }),
      ...(rootType && { tabType: rootType }),
    };

    try {
      const response = await QuicklinksSdk.createData(
        "/api/quicklinks/directory-list",
        newDirectory
      );
      // Dispatch to add new directory to Redux state
      if (!parentDirId) dispatch(setNewParentDir(response.data.directory));
      else dispatch(addNewDirectory(response.data.directory));

      dispatch(setModal({ type: null, data: null }));

      // Show success toast
      dispatch(
        setToast({
          toastMsg: "New directory has been created!",
          toastSev: ToastSeverity.success,
        })
      );

      return response.data.directory; // Can be used for further processing
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );

      throw error;
    }finally{
      dispatch(setIsLoading(false));
    }
  }
);
