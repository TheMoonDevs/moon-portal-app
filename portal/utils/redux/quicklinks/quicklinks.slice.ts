import { ToastSeverity } from "@/components/elements/Toast";
import {
  ParentDirectory,
  Directory,
  Link,
  User,
  UserLink,
} from "@prisma/client";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const toggleFavoriteList = (prevFavList: Link[], currentFavoriteLink: Link) => {
  if (prevFavList.find((link) => link.id === currentFavoriteLink.id)) {
    return prevFavList.filter((link) => link.id !== currentFavoriteLink.id);
  } else {
    return [...prevFavList, { ...currentFavoriteLink, isFavorite: true }];
  }
};

const updateDirectoryPositions = (
  state: any,
  updatedDir: Directory | ParentDirectory,
  isParent: boolean
) => {
  const targetArray = isParent
    ? (state.parentDirs as ParentDirectory[])
    : (state.directories as Directory[]);
  const index = targetArray.findIndex(
    (dir: Directory | ParentDirectory) => dir.id === updatedDir.id
  );
  if (index !== -1) {
    targetArray[index] = updatedDir;
  }
};

type listView = "list" | "widget" | "thumbnail" | "line";

interface QuicklinksState {
  directories: Directory[];
  parentDirs: ParentDirectory[];
  rootDirectories: Directory[];
  popoverElementWithData: {
    element: HTMLSpanElement | null;
    anchorId: string | null;
    data: any | null;
  };
  allQuicklinks: Link[];
  favoriteList: Link[];
  topUsedList: Link[];
  currentView: listView;
  toast: {
    showToast: boolean;
    toastMsg: string;
    toastSev: ToastSeverity | undefined;
  };
  activeDirectoryId: null | string;
  isCreateLinkModalOpen: boolean;
}

export const shortUrlSlice = createSlice({
  name: "quicklinks",
  initialState: {
    rootDirectories: [],
    parentDirs: [],
    allQuicklinks: [],
    directories: [],
    favoriteList: [],
    topUsedList: [],
    currentView:
      typeof window !== "undefined" && localStorage.getItem("currentView")
        ? (localStorage.getItem("currentView") as listView)
        : "widget",
    activeDirectoryId: null,
    isCreateLinkModalOpen: false,
    popoverElementWithData: {
      element: null,
      anchorId: null,
      data: null,
    },
    toast: {
      showToast: false,
      toastMsg: "",
      toastSev: undefined,
    },
  } as QuicklinksState,
  reducers: {
    setPopoverElementWithData: (state, action) => {
      state.popoverElementWithData = {
        ...state.popoverElementWithData,
        ...action.payload,
      };
    },
    setActiveDirectoryId: (state, action) => {
      state.activeDirectoryId = action.payload;
    },
    setNewParentDir: (state, action) => {
      state.parentDirs = [...state.parentDirs, action.payload];
    },
    deleteDirectory: (state, action) => {
      state.directories = state.directories.filter(
        (directory) => directory.id !== action.payload
      );
    },

    deleteParentDir: (state, action) => {
      state.parentDirs = state.parentDirs.filter(
        (directory) => directory.id !== action.payload
      );
    },

    setFavoriteList: (state, action: PayloadAction<UserLink[]>) => {
      state.favoriteList = action.payload.map((item) => {
        return {
          ...(item as any).linkData,
          isFavorite: true,
        };
      });
    },

    setTopUsedList: (state, action: PayloadAction<Link[]>) => {
      state.topUsedList = action.payload;
    },

    toggleFavorite: (state, action) => {
      state.favoriteList = toggleFavoriteList(
        state.favoriteList,
        action.payload
      );
    },
    setToast: (state, action) => {
      state.toast = {
        showToast:
          action.payload.showToast === false &&
          action.payload.showToast !== undefined
            ? action.payload.showToast
            : true,
        toastMsg: action.payload.toastMsg,
        toastSev: action.payload.toastSev,
      };
    },

    updateDirectory: (state, action) => {
      if (!action.payload) return;
      if (!action.payload?.parentDirId) {
        state.parentDirs = state.parentDirs.map((directory) => {
          if (directory.id === action.payload.id) {
            return action.payload;
          }
          return directory;
        });
      } else {
        state.directories = state.directories.map((directory) => {
          if (directory.id === action.payload.id) {
            return action.payload;
          }
          return directory;
        });
      }
    },

    // setCurrDirectoryId: (state, action) => {
    //   state.currDirectoryId = action.payload;
    // },
    setDirectoryList: (state, action) => {
      state.directories = action.payload;
    },

    addNewDirectory: (state, action) => {
      state.directories = [...state.directories, action.payload];
    },
    setAllQuicklinks: (state, action) => {
      state.allQuicklinks = action.payload;
    },

    updateQuicklink: (state, action) => {
      state.allQuicklinks = state.allQuicklinks.map((link) => {
        if (link.id === action.payload.id) {
          return action.payload;
        }
        return link;
      });
    },
    setParentDirsList: (state, action) => {
      state.parentDirs = action.payload;
    },
    setRootDirList: (state, action) => {
      state.rootDirectories = action.payload;
    },
    addNewQuicklink: (state, action) => {
      state.allQuicklinks = [...state.allQuicklinks, action.payload];
    },
    deleteQuicklink: (state, action) => {
      if (state.allQuicklinks.length > 0) {
        state.allQuicklinks = state.allQuicklinks.filter(
          (link) => link.id !== action.payload
        );
      }
      if (state.topUsedList.length > 0) {
        state.topUsedList = state.topUsedList.filter(
          (link) => link.id !== action.payload
        );
      }
      if (state.favoriteList.length > 0) {
        state.favoriteList = state.favoriteList.filter(
          (link) => link.id !== action.payload
        );
      }
    },
    setIsCreateLinkModalOpen: (state, action) => {
      state.isCreateLinkModalOpen = action.payload;
    },

    setCurrentView: (state, action) => {
      if (typeof window !== "undefined")
        localStorage.setItem("currentView", action.payload);
      state.currentView = action.payload;
    },

    updateMultipleDirectories: (
      state,
      action: PayloadAction<{
        directories: Directory[] | ParentDirectory[];
        isParent: boolean;
      }>
    ) => {
      const { directories, isParent } = action.payload;
      directories.forEach((updatedDir) => {
        updateDirectoryPositions(state, updatedDir, isParent);
      });
    },
  },
});

export const {
  setToast,
  deleteQuicklink,
  deleteParentDir,
  updateQuicklink,
  toggleFavorite,
  setFavoriteList,
  setTopUsedList,
  deleteDirectory,
  addNewDirectory,
  setDirectoryList,
  setParentDirsList,
  setRootDirList,
  setNewParentDir,
  setActiveDirectoryId,
  updateDirectory,
  setAllQuicklinks,
  setIsCreateLinkModalOpen,
  addNewQuicklink,
  setPopoverElementWithData,
  setCurrentView,
  updateMultipleDirectories,
} = shortUrlSlice.actions;

export default shortUrlSlice.reducer;
