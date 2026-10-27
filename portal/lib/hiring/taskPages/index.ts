import type { JobTask } from '@/models/hiring';

import { conceptArtistPage, conceptArtistStarterTask } from './concept-artist';
import { launchNightPage, launchNightStarterTask } from './launch-night';
import { talentScoutPage, talentScoutStarterTask } from './talent-scout';
import type { TaskPageConfig } from './types';

export type { TaskPageConfig, TaskSceneKey } from './types';

/** Designed intros an opening's task can open with, by key. */
export const TASK_PAGES: Record<string, TaskPageConfig> = {
  [conceptArtistPage.key]: conceptArtistPage,
  [talentScoutPage.key]: talentScoutPage,
  [launchNightPage.key]: launchNightPage,
};

/** A starting brief per intro, offered in the opening editor. */
export const STARTER_TASKS: Record<string, JobTask> = {
  [conceptArtistPage.key]: conceptArtistStarterTask,
  [talentScoutPage.key]: talentScoutStarterTask,
  [launchNightPage.key]: launchNightStarterTask,
};
