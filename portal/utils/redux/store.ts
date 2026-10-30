import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux/es/types';

import authReducer from './auth/auth.slice';
import filesUploadReducer from './filesUpload/fileUpload.slice';
import uiReducer from './ui/ui.slice';
import laterTodosReducer from './worklogs/laterTodos.slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    filesUpload: filesUploadReducer,
    ui: uiReducer,
    laterTodos: laterTodosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch<AppDispatch>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
