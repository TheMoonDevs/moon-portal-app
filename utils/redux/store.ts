import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { TypedUseSelectorHook } from "react-redux/es/types";
// import authReducer from 'lib/redux/auth/auth.slice';

import uiReducer from "./ui/ui.slice";
import shortUrlReducer from "./shortUrl/shortUrl.slice";
import authReducer from "./auth/auth.slice";
import quicklinksReducer from "./quicklinks/quicklinks.slice";
import searchTermReducer from "./searchTerm/search.slice";
import filesUploadReducer from "./filesUpload/fileUpload.slice";
//import suggestionsReducer from './suggestions/suggestions.slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    quicklinks: quicklinksReducer,
    ui: uiReducer,
    shortUrl: shortUrlReducer,
    filesUpload: filesUploadReducer,
    searchTerm: searchTermReducer,
    //suggestions: suggestionsReducer,
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
