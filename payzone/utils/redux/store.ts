import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { TypedUseSelectorHook } from "react-redux/es/types";

// import walletReducer from './wallet/wallet.slice';
import authReducer from "./auth/auth.slice";
import dbReducer from "./db/db.slice";
import certificatesUploadReducer from "./cerificatesUpload/certificate.slice";
import searchTermReducer from "./searchTerm/search.slice";
import balancesReducer from "./balances/balances.slice";
// import uiReducer from "./ui/ui.slice";

const store = configureStore({
  reducer: {
    // wallet: walletReducer,
    auth: authReducer,
    db: dbReducer,
    certificatesUpload: certificatesUploadReducer,
    searchTerm: searchTermReducer,
    balances: balancesReducer,
    // ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      // serializableCheck: {
      //   ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      // },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch<AppDispatch>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
