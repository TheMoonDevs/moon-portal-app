import { ToastSeverity } from "@/components/elements/Toast";
import { UserLink, Link } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type listView = "list" | "widget" | "thumbnail" | "line";

interface QuikcklinksUIState {
  popoverElementWithData: {
    element: HTMLSpanElement | null;
    anchorId: string | null;
    data: any | null;
  };
  modal: {
    type: "rename-folder" | "move-folder" | "create-folder" | null;
    data: any | null;
  };
  currentView: listView;
  toast: {
    showToast: boolean;
    toastMsg: string;
    toastSev: ToastSeverity | undefined;
  };
  isCreateLinkModalOpen: boolean;
  isLoading: boolean;
}

const initialState: QuikcklinksUIState = {
  popoverElementWithData: {
    element: null,
    anchorId: null,
    data: null,
  },
  modal: {
    type: null,
    data: null,
  },
  currentView:
    typeof window !== "undefined" && localStorage.getItem("currentView")
      ? (localStorage.getItem("currentView") as listView)
      : "widget",
  toast: {
    showToast: false,
    toastMsg: "",
    toastSev: undefined,
  },
  isCreateLinkModalOpen: false,
  isLoading: false
};

export const quicklinksUiSlice = createSlice({
  name: "quicklinksUI",
  initialState,
  reducers: {
    setPopoverElementWithData: (state, action) => {
      state.popoverElementWithData = {
        ...state.popoverElementWithData,
        ...action.payload,
      };
    },
    setModal: (state, action) => {
      state.modal = action.payload;
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
    setCurrentView: (state, action) => {
      if (typeof window !== "undefined")
        localStorage.setItem("currentView", action.payload);
      state.currentView = action.payload;
    },
    setIsCreateLinkModalOpen: (state, action) => {
      state.isCreateLinkModalOpen = action.payload;
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload
    }
  },
});

export const {
  setPopoverElementWithData,
  setModal,
  setToast,
  setCurrentView,
  setIsCreateLinkModalOpen,
  setIsLoading
} = quicklinksUiSlice.actions;

export default quicklinksUiSlice.reducer;
