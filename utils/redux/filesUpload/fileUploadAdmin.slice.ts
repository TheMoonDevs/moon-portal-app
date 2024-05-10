import { createSlice } from "@reduxjs/toolkit";

export interface FileAdminWithPath extends File {
  path?: string;
  // Add other properties as needed
}

interface FileState {
  files: FileAdminWithPath[];
}

const initialState: FileState = {
  files: [],
};

export const filesAdminUploadSlice = createSlice({
  name: "filesAdminUpload",
  initialState,
  reducers: {
    addFileFromAdmin: (state, action) => {
      state.files = [...state.files, ...action.payload];
    },
    removeFileFromAdmin: (state, action) => {
      state.files = state.files.filter(
        (file, index) =>
          file.path !== action.payload.path &&
          (file as any).lastModified !== action.payload.lastModified
      );
    },
  },
});

export const { addFileFromAdmin, removeFileFromAdmin } =
  filesAdminUploadSlice.actions;

export default filesAdminUploadSlice.reducer;

