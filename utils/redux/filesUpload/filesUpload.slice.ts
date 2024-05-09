import { createSlice } from "@reduxjs/toolkit";

export interface FileWithPath extends File {
  path?: string;
  // Add other properties as needed
}

interface FilesState {
  files: FileWithPath[];
}

const initialState: FilesState = {
  files: [],
};

export const filesUploadSlice = createSlice({
  name: "filesUpload",
  initialState,
  reducers: {
    addFile: (state, action) => {
      state.files = [...state.files, ...action.payload];
    },
    removeFile: (state, action) => {
      state.files = state.files.filter(
        (file, index) =>
          file.path !== action.payload.path &&
          (file as any).lastModified !== action.payload.lastModified
      );
    },
  },
});

export const { addFile, removeFile } = filesUploadSlice.actions;

export default filesUploadSlice.reducer;
