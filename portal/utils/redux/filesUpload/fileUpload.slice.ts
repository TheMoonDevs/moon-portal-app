import { FileUpload } from "@prisma/client";
import { createSlice } from "@reduxjs/toolkit";

export interface FileAdminWithPath extends File {
  path?: string;
  // Add other properties as needed
}

interface FileState {
  files: FileAdminWithPath[];
  uploadedFiles: FileUpload[];
}

const initialState: FileState = {
  files: [],
  uploadedFiles: [],
};

export const filesUploadSlice = createSlice({
  name: "filesUpload",
  initialState,
  reducers: {
    addFilesToPreview: (state, action) => {
      state.files = [...state.files, ...action.payload];
    },

    resetPreview: (state) => {
      state.files = [];
    },

    setUploadedFiles: (state, action) => {
      state.uploadedFiles = [...state.uploadedFiles, ...action.payload];
    },
    deleteUploadedFile: (state, action) => {
      state.uploadedFiles = state.uploadedFiles.filter(
        (file, index) => file.id !== action.payload.id
      );
    },
    removeFilesFromPreview: (state, action) => {
      state.files = state.files.filter(
        (file, index) =>
          file.path !== action.payload.path &&
          (file as any).lastModified !== action.payload.lastModified
      );
    },
  },
});

export const {
  resetPreview,
  addFilesToPreview,
  removeFilesFromPreview,
  setUploadedFiles,
  deleteUploadedFile,
} = filesUploadSlice.actions;

export default filesUploadSlice.reducer;
