import { createSlice } from "@reduxjs/toolkit";

export interface FileWithPath {
  path: string;
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
      state.files.push(action.payload);
    },
    removeFile: (state, action) => {
      state.files = state.files.filter(
        (file, index) => index !== action.payload
      );
    },
  },
});

export const { addFile, removeFile } = filesUploadSlice.actions;

export default filesUploadSlice.reducer;
