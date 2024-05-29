import { User } from "@prisma/client";
import { createSlice } from "@reduxjs/toolkit";
export interface FileWithPath extends File {
  path?: string;
  // Add other properties as needed
}
export interface IFile extends FileWithPath {
  id?: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  fileSize: number;
}

export interface ICertificate {
  id: string;
  userId: string;
  title: string;
  uploadedByUserId?: string;
  file: IFile;
  userInfo?: User;
  createdAt: Date;
  updatedAt: Date;
}

interface CertificateState {
  isAdminView: boolean;
  certificateFilePreview: FileWithPath[];
  certificates: ICertificate[];
  users: User[];
}

const initialState: CertificateState = {
  isAdminView: false,
  certificateFilePreview: [],
  certificates: [],
  users: [],
};

export const filesUploadSlice = createSlice({
  name: "certificatesUpload",
  initialState,
  reducers: {
    addCertificateFilesToPreview: (state, action) => {
      state.certificateFilePreview = [
        ...state.certificateFilePreview,
        ...action.payload,
      ];
    },

    resetPreview: (state) => {
      state.certificateFilePreview = [];
    },

    setCertificates: (state, action) => {
      // console.log(action.payload);
      state.certificates = action.payload;
    },
    addCertificates: (state, action) => {
      state.certificates = [...action.payload, ...state.certificates];
    },
    deleteUploadedFile: (state, action) => {
      state.certificates = state.certificates.filter(
        (file, index) => file.id !== action.payload.id
      );
    },

    updateCertificateData: (state, action) => {
      state.certificates = state.certificates.map((certificate) => {
        if (certificate.id === action.payload.id) {
          return action.payload;
        }
        return certificate;
      });
    },
    removeFilesFromPreview: (state, action) => {
      state.certificateFilePreview = state.certificateFilePreview.filter(
        (file, index) =>
          file.path !== action.payload.path &&
          (file as any).lastModified !== action.payload.lastModified
      );
    },

    setAllUsers: (state, action) => {
      state.users = action.payload;
    },

    setAdminView: (state, action) => {
      state.isAdminView = action.payload;
    },
  },
});

export const {
  resetPreview,
  addCertificateFilesToPreview,
  addCertificates,
  removeFilesFromPreview,
  setCertificates,
  deleteUploadedFile,
  setAdminView,
  setAllUsers,
  updateCertificateData,
} = filesUploadSlice.actions;

export default filesUploadSlice.reducer;
