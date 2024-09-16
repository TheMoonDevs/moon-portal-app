import { UserLink, Link, DirectoryList, UserDirectory } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  toggleFavoriteDirectoryList,
  updateDirectoryPositions,
} from "../helpers";

interface QuikcklinksDirectoryState {
  directories: DirectoryList[];
  parentDirs: DirectoryList[];
  rootDirectories: DirectoryList[];
  favoriteDirectoryList: DirectoryList[];
  recentlyUsedDirectoryList: DirectoryList[];
  topUsedDirectoryList: DirectoryList[];
  activeDirectoryId: null | string;
}

const initialState: QuikcklinksDirectoryState = {
  directories: [],
  rootDirectories: [],
  parentDirs: [],
  favoriteDirectoryList: [],
  recentlyUsedDirectoryList: [],
  topUsedDirectoryList: [],
  activeDirectoryId: null,
};

export const quicklinksDirectorySlice = createSlice({
  name: "quicklinksDirectory",
  initialState,
  reducers: {
    setActiveDirectoryId: (state, action) => {
      state.activeDirectoryId = action.payload;
    },
    setNewParentDir: (state, action) => {
      state.parentDirs = [action.payload, ...state.parentDirs];
    },
    setParentDirsList: (state, action) => {
      state.parentDirs = action.payload;
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
    setFavoriteDirectoryList: (
      state,
      action: PayloadAction<UserDirectory[]>
    ) => {
      state.favoriteDirectoryList = action.payload.map((item) => {
        return {
          ...(item as any).directoryData,
          isFavorite: true,
        };
      });
    },

    setRecentlyUsedDirectoryList: (
      state,
      action: PayloadAction<DirectoryList[]>
    ) => {
      state.recentlyUsedDirectoryList = action.payload;
    },

    setTopUsedDirectoryList: (state, action) => {
      state.topUsedDirectoryList = action.payload;
    },

    toggleFavoriteDirectory: (state, action) => {
      state.favoriteDirectoryList = toggleFavoriteDirectoryList(
        state.favoriteDirectoryList,
        action.payload
      );
    },

    clearThisDirectoryFromOtherLists: (state, action) => {
      state.favoriteDirectoryList = state.favoriteDirectoryList.filter(
        (directory) => directory.id !== action.payload.id
      );
      state.recentlyUsedDirectoryList = state.recentlyUsedDirectoryList.filter(
        (directory) => directory.id !== action.payload.id
      );
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
    setDirectoryList: (state, action) => {
      state.directories = action.payload;
    },

    addNewDirectory: (state, action) => {
      state.directories = [...state.directories, action.payload];
    },

    setRootDirList: (state, action) => {
      state.rootDirectories = action.payload;
    },
    updateMultipleDirectories: (
      state,
      action: PayloadAction<{
        directories: DirectoryList[];
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
  setActiveDirectoryId,
  setNewParentDir,
  setParentDirsList,
  deleteDirectory,
  deleteParentDir,
  setFavoriteDirectoryList,
  setRecentlyUsedDirectoryList,
  setTopUsedDirectoryList,
  toggleFavoriteDirectory,
  clearThisDirectoryFromOtherLists,
  updateDirectory,
  setDirectoryList,
  addNewDirectory,
  setRootDirList,
  updateMultipleDirectories,
} = quicklinksDirectorySlice.actions;

export default quicklinksDirectorySlice.reducer;
