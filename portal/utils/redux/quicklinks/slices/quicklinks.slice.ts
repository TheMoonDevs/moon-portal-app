// import { ToastSeverity } from "@/components/elements/Toast";
// import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
// import {
//   Directory,
//   Link,
//   UserLink,
//   ROOTTYPE,
//   DirectoryList,
//   UserDirectory,
// } from "@prisma/client";
// import { PayloadAction, createSlice } from "@reduxjs/toolkit";
// import {
//   toggleFavoriteDirectoryList,
//   toggleFavoriteList,
//   updateDirectoryPositions,
// } from "../helpers";

// type listView = "list" | "widget" | "thumbnail" | "line";

// interface QuicklinksState {
//   directories: DirectoryList[];
//   parentDirs: DirectoryList[];
//   rootDirectories: DirectoryList[];
//   popoverElementWithData: {
//     element: HTMLSpanElement | null;
//     anchorId: string | null;
//     data: any | null;
//   };
//   modal: {
//     type: "rename-folder" | "move-folder" | "create-folder" | null;
//     data: any | null;
//   };
//   allQuicklinks: Link[];
//   favoriteList: Link[];
//   topUsedList: Link[];
//   favoriteDirectoryList: DirectoryList[];
//   recentlyUsedDirectoryList: DirectoryList[];
//   topUsedDirectoryList: DirectoryList[];
//   currentView: listView;
//   pathForBreadcrumb: string;
//   toast: {
//     showToast: boolean;
//     toastMsg: string;
//     toastSev: ToastSeverity | undefined;
//   };
//   activeDirectoryId: null | string;
//   isCreateLinkModalOpen: boolean;
// }

// export const quicklinks = createSlice({
//   name: "quicklinks",
//   initialState: {
//     rootDirectories: [],
//     parentDirs: [],
//     allQuicklinks: [],
//     directories: [],
//     favoriteList: [],
//     topUsedList: [],
//     favoriteDirectoryList: [],
//     recentlyUsedDirectoryList: [],
//     topUsedDirectoryList: [],
//     pathForBreadcrumb: "",
//     currentView:
//       typeof window !== "undefined" && localStorage.getItem("currentView")
//         ? (localStorage.getItem("currentView") as listView)
//         : "widget",
//     activeDirectoryId: null,
//     isCreateLinkModalOpen: false,
//     popoverElementWithData: {
//       element: null,
//       anchorId: null,
//       data: null,
//     },
//     modal: {
//       type: null,
//       data: null,
//     },
//     toast: {
//       showToast: false,
//       toastMsg: "",
//       toastSev: undefined,
//     },
//   } as QuicklinksState,
//   reducers: {
//     setPathForBreadcrumb: (state, action) => {
//       state.pathForBreadcrumb = state.pathForBreadcrumb + action.payload;
//     },
//     setPopoverElementWithData: (state, action) => {
//       state.popoverElementWithData = {
//         ...state.popoverElementWithData,
//         ...action.payload,
//       };
//     },
//     setModal: (state, action) => {
//       state.modal = action.payload;
//     },
//     setActiveDirectoryId: (state, action) => {
//       state.activeDirectoryId = action.payload;
//     },
//     setNewParentDir: (state, action) => {
//       state.parentDirs = [action.payload, ...state.parentDirs];
//     },
//     deleteDirectory: (state, action) => {
//       state.directories = state.directories.filter(
//         (directory) => directory.id !== action.payload
//       );
//     },

//     deleteParentDir: (state, action) => {
//       state.parentDirs = state.parentDirs.filter(
//         (directory) => directory.id !== action.payload
//       );
//     },

//     setFavoriteList: (state, action: PayloadAction<UserLink[]>) => {
//       state.favoriteList = action.payload.map((item) => {
//         return {
//           ...(item as any).linkData,
//           isFavorite: true,
//         };
//       });
//     },

//     setTopUsedList: (state, action: PayloadAction<Link[]>) => {
//       state.topUsedList = action.payload;
//     },

//     toggleFavorite: (state, action) => {
//       state.favoriteList = toggleFavoriteList(
//         state.favoriteList,
//         action.payload
//       );
//     },
//     setFavoriteDirectoryList: (
//       state,
//       action: PayloadAction<UserDirectory[]>
//     ) => {
//       state.favoriteDirectoryList = action.payload.map((item) => {
//         return {
//           ...(item as any).directoryData,
//           isFavorite: true,
//         };
//       });
//     },

//     setRecentlyUsedDirectoryList: (
//       state,
//       action: PayloadAction<DirectoryList[]>
//     ) => {
//       state.recentlyUsedDirectoryList = action.payload;
//     },

//     setTopUsedDirectoryList: (state, action) => {
//       state.topUsedDirectoryList = action.payload;
//     },

//     toggleFavoriteDirectory: (state, action) => {
//       state.favoriteDirectoryList = toggleFavoriteDirectoryList(
//         state.favoriteDirectoryList,
//         action.payload
//       );
//     },

//     clearThisDirectoryFromOtherLists: (state, action) => {
//       state.favoriteDirectoryList = state.favoriteDirectoryList.filter(
//         (directory) => directory.id !== action.payload.id
//       );
//       state.recentlyUsedDirectoryList = state.recentlyUsedDirectoryList.filter(
//         (directory) => directory.id !== action.payload.id
//       );
//     },
//     setToast: (state, action) => {
//       state.toast = {
//         showToast:
//           action.payload.showToast === false &&
//           action.payload.showToast !== undefined
//             ? action.payload.showToast
//             : true,
//         toastMsg: action.payload.toastMsg,
//         toastSev: action.payload.toastSev,
//       };
//     },

//     updateDirectory: (state, action) => {
//       if (!action.payload) return;
//       if (!action.payload?.parentDirId) {
//         state.parentDirs = state.parentDirs.map((directory) => {
//           if (directory.id === action.payload.id) {
//             return action.payload;
//           }
//           return directory;
//         });
//       } else {
//         state.directories = state.directories.map((directory) => {
//           if (directory.id === action.payload.id) {
//             return action.payload;
//           }
//           return directory;
//         });
//       }
//     },

//     // setCurrDirectoryId: (state, action) => {
//     //   state.currDirectoryId = action.payload;
//     // },
//     setDirectoryList: (state, action) => {
//       state.directories = action.payload;
//     },

//     addNewDirectory: (state, action) => {
//       state.directories = [...state.directories, action.payload];
//     },
//     setAllQuicklinks: (state, action) => {
//       state.allQuicklinks = action.payload;
//     },

//     updateQuicklink: (state, action) => {
//       state.allQuicklinks = state.allQuicklinks.map((link) => {
//         if (link.id === action.payload.id) {
//           return action.payload;
//         }
//         return link;
//       });
//     },
//     setParentDirsList: (state, action) => {
//       state.parentDirs = action.payload;
//     },
//     setRootDirList: (state, action) => {
//       state.rootDirectories = action.payload;
//     },
//     addNewQuicklink: (state, action) => {
//       state.allQuicklinks = [...state.allQuicklinks, action.payload];
//     },
//     deleteQuicklink: (state, action) => {
//       if (state.allQuicklinks.length > 0) {
//         state.allQuicklinks = state.allQuicklinks.filter(
//           (link) => link.id !== action.payload
//         );
//       }
//       if (state.topUsedList.length > 0) {
//         state.topUsedList = state.topUsedList.filter(
//           (link) => link.id !== action.payload
//         );
//       }
//       if (state.favoriteList.length > 0) {
//         state.favoriteList = state.favoriteList.filter(
//           (link) => link.id !== action.payload
//         );
//       }
//     },
//     setIsCreateLinkModalOpen: (state, action) => {
//       state.isCreateLinkModalOpen = action.payload;
//     },

//     setCurrentView: (state, action) => {
//       if (typeof window !== "undefined")
//         localStorage.setItem("currentView", action.payload);
//       state.currentView = action.payload;
//     },

//     updateMultipleDirectories: (
//       state,
//       action: PayloadAction<{
//         directories: DirectoryList[];
//         isParent: boolean;
//       }>
//     ) => {
//       const { directories, isParent } = action.payload;
//       directories.forEach((updatedDir) => {
//         updateDirectoryPositions(state, updatedDir, isParent);
//       });
//     },
//   },
// });

// export const {
//   setToast,
//   deleteQuicklink,
//   deleteParentDir,
//   updateQuicklink,
//   toggleFavorite,
//   toggleFavoriteDirectory,
//   setFavoriteDirectoryList,
//   setRecentlyUsedDirectoryList,
//   setTopUsedDirectoryList,
//   clearThisDirectoryFromOtherLists,
//   setFavoriteList,
//   setTopUsedList,
//   deleteDirectory,
//   addNewDirectory,
//   setDirectoryList,
//   setParentDirsList,
//   setRootDirList,
//   setNewParentDir,
//   setActiveDirectoryId,
//   updateDirectory,
//   setAllQuicklinks,
//   setIsCreateLinkModalOpen,
//   addNewQuicklink,
//   setPopoverElementWithData,
//   setModal,
//   setCurrentView,
//   updateMultipleDirectories,
//   setPathForBreadcrumb,
// } = quicklinks.actions;

// export default quicklinks.reducer;
