import { UserLink, Link } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { toggleFavoriteLinksList } from "../helpers";

type listView = "list" | "widget" | "thumbnail" | "line";

interface QuikcklinksLinksState {
  allQuicklinks: Link[];
  favoriteLinksList: Link[];
  topUsedLinksList: Link[];
  currentView: listView;
}

const initialState: QuikcklinksLinksState = {
  allQuicklinks: [],
  favoriteLinksList: [],
  topUsedLinksList: [],
  currentView:
    typeof window !== "undefined" && localStorage.getItem("currentView")
      ? (localStorage.getItem("currentView") as listView)
      : "widget",
};

export const quicklinksLinksSlice = createSlice({
  name: "quicklinksLinks",
  initialState,
  reducers: {
    setAllQuicklinks: (state, action) => {
      state.allQuicklinks = action.payload;
    },
    addNewQuicklink: (state, action) => {
      state.allQuicklinks = [action.payload, ...state.allQuicklinks];
    },
    setFavoriteLinksList: (state, action: PayloadAction<UserLink[]>) => {
      state.favoriteLinksList = action.payload.map((item) => {
        return {
          ...(item as any).linkData,
          isFavorite: true,
        };
      });
    },
    setTopUsedLinksList: (state, action: PayloadAction<Link[]>) => {
      state.topUsedLinksList = action.payload;
    },
    toggleFavoriteLinks: (state, action) => {
      state.favoriteLinksList = toggleFavoriteLinksList(
        state.favoriteLinksList,
        action.payload
      );
    },
    deleteQuicklink: (state, action) => {
      if (state.allQuicklinks.length > 0) {
        state.allQuicklinks = state.allQuicklinks.filter(
          (link) => link.id !== action.payload
        );
      }
      if (state.topUsedLinksList.length > 0) {
        state.topUsedLinksList = state.topUsedLinksList.filter(
          (link) => link.id !== action.payload
        );
      }
      if (state.favoriteLinksList.length > 0) {
        state.favoriteLinksList = state.favoriteLinksList.filter(
          (link) => link.id !== action.payload
        );
      }
    },
  },
});

export const {
  setAllQuicklinks,
  addNewQuicklink,
  setFavoriteLinksList,
  setTopUsedLinksList,
  deleteQuicklink,
  toggleFavoriteLinks,
} = quicklinksLinksSlice.actions;

export default quicklinksLinksSlice.reducer;
