import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { api } from './api';
import { APP_VERSION } from './config';
import type { TaskMove } from './types';

/*
 * Data from the portal is cached on the phone, so the app opens with what it
 * last showed and still reads with no network. Work logged offline waits as
 * a paused request, is saved with the cache, and is sent once the phone is
 * back online, even after the app was closed.
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Kept a day, so a cold start offline still has something to show.
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'portal.cache',
  throttleTime: 2000,
});

export const persistOptions = {
  persister,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // A new app version starts with a fresh cache.
  buster: APP_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string }; meta?: Record<string, unknown> }) =>
      query.state.status === 'success' && !query.meta?.noPersist,
  },
};

/** What "Log work" sends: a note and/or a status on one task. */
export type LogPointInput = {
  taskId: string;
  text: string;
  status?: TaskMove | null;
  /** The day it is logged on; today when left out. */
  date?: string;
};

/** Where a task goes: a project, the person's Personal, or nowhere yet. */
export type PlaceInput = { projectId: string } | { personal: true } | { none: true };

/** What changing a task sends (title, day, status, project). */
export type TaskChangeInput = {
  taskId: string;
  title?: string;
  forDate?: string | null;
  status?: TaskMove;
  note?: string;
  place?: PlaceInput;
};

export const MUTATIONS = {
  logPoint: ['logPoint'] as const,
  changeTask: ['changeTask'] as const,
};

// Saved mutations need their functions back after a restart.
queryClient.setMutationDefaults(MUTATIONS.logPoint, {
  mutationFn: (input: LogPointInput) =>
    api('/api/me/day/points', {
      method: 'POST',
      body: {
        taskId: input.taskId,
        text: input.text,
        ...(input.status && { status: input.status }),
        ...(input.date && { date: input.date }),
      },
    }),
  onSettled: () => refreshWork(),
});

queryClient.setMutationDefaults(MUTATIONS.changeTask, {
  mutationFn: ({ taskId, ...change }: TaskChangeInput) =>
    api(`/api/me/day/tasks/${taskId}`, { method: 'PATCH', body: change }),
  onSettled: () => refreshWork(),
});

/** Everything that shows tasks or work, after a change. */
export function refreshWork() {
  for (const key of ['day', 'days', 'tasks', 'task', 'month', 'project', 'goals'])
    void queryClient.invalidateQueries({ queryKey: [key] });
}

// Online and offline from the phone's network state.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

// Coming back to the app counts as focusing it: stale screens refresh.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}

/** Forgets every cached answer and waiting change (on sign-out). */
export async function clearCache() {
  queryClient.getMutationCache().clear();
  queryClient.clear();
  await persister.removeClient();
}
