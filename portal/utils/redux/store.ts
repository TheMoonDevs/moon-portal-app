import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux/es/types';

import authReducer from './auth/auth.slice';
import filesUploadReducer from './filesUpload/fileUpload.slice';
import notificationsReducer from './notification/notification.slice';
import uiReducer from './ui/ui.slice';
import laterTodosReducer from './worklogs/laterTodos.slice';
import worklogsReducer from './worklogs/worklogs.slice';
import statsActionReducer from './worklogsSummary/statsAction.slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    filesUpload: filesUploadReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
    worklogs: worklogsReducer,
    laterTodos: laterTodosReducer,
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
