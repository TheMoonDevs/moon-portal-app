import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux/es/types';

import authReducer from './auth/auth.slice';
import coreTeamReducer from './coreTeam/coreTeam.slice';
import filesUploadReducer from './filesUpload/fileUpload.slice';
import notificationsReducer from './notification/notification.slice';
import shortUrlReducer from './shortUrl/shortUrl.slice';
import uiReducer from './ui/ui.slice';
import adminTasksReducer from './worklogs/adminTasks.slice';
import laterTodosReducer from './worklogs/laterTodos.slice';
import monthlyTargetsReducer from './worklogs/monthlyTargets.slice';
import worklogsReducer from './worklogs/worklogs.slice';
import statsActionReducer from './worklogsSummary/statsAction.slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    coreTeam: coreTeamReducer,
    filesUpload: filesUploadReducer,
    notifications: notificationsReducer,
    shortUrl: shortUrlReducer,
    ui: uiReducer,
    worklogs: worklogsReducer,
    adminTasks: adminTasksReducer,
    laterTodos: laterTodosReducer,
    monthlyTargets: monthlyTargetsReducer,
    statsAction: statsActionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch<AppDispatch>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
