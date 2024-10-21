import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { TypedUseSelectorHook } from "react-redux/es/types";

import uiReducer from "./ui/ui.slice";
import shortUrlReducer from "./shortUrl/shortUrl.slice";
import authReducer from "./auth/auth.slice";
import zerotrackerReducer from "./zerotracker/zerotracker.slice";
import searchTermReducer from "./searchTerm/search.slice";
import filesUploadReducer from "./filesUpload/fileUpload.slice";
import onboardingFormReducer from "./onboarding/onboarding.slice";
import worklogsReducer from "./worklogs/worklogs.slice";
import selectedMissionReducer from "./missions/selectedMission.slice";
import missionTasksReducer from "./missions/missionsTasks.slice";
import laterTodosReducer from "./worklogs/laterTodos.slice";
//import suggestionsReducer from './suggestions/suggestions.slice';
import notificationsReducer from "./notification/notification.slice";
import coreTeamSlice from "./coreTeam/coreTeam.slice";
import missionTaskEditorSlice from "./missions/missionTaskEditorSlice.slice";
import quicklinksLinksReducer from "./quicklinks/slices/quicklinks.links.slice";
import quicklinksDirectoryReducer from "./quicklinks/slices/quicklinks.directory.slice";
import quicklinksUiReducer from "./quicklinks/slices/quicklinks.ui.slice";
import statsActionSlice from './worklogsSummary/statsAction.slice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    quicklinksLinks: quicklinksLinksReducer,
    quicklinksDirectory: quicklinksDirectoryReducer,
    quicklinksUi: quicklinksUiReducer,
    ui: uiReducer,
    shortUrl: shortUrlReducer,
    zerotracker: zerotrackerReducer,
    filesUpload: filesUploadReducer,
    worklogs: worklogsReducer,
    laterTodos: laterTodosReducer,
    searchTerm: searchTermReducer,
    onboardingForm: onboardingFormReducer,
    selectedMission: selectedMissionReducer,
    coreTeam: coreTeamSlice,
    //suggestions: suggestionsReducer,
    notifications: notificationsReducer,
    missionsTasks: missionTasksReducer,
    missionTaskEditor: missionTaskEditorSlice,
    statsAction: statsActionSlice
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
