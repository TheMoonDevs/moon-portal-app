import dayjs from 'dayjs';

import type { WorkLogPoints } from '@/utils/@types/interfaces';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';
import { PortalSdk } from '@/utils/services/PortalSdk';

const MARKDOWN_PLACHELODER = `* `;
export const DEFAULT_MARKDOWN_DATA: WorkLogPoints[] = [
  {
    link_type: LOGLINKTYPE.GENERAL,
    link_id: 'general',
    title: 'General',
    icon: 'work',
    content: MARKDOWN_PLACHELODER,
  },
];
export const WorkLogsHelper = {
  defaultWorklogs: (date?: string | null, user?: any) => {
    const this_date = date || dayjs().format('YYYY-MM-DD');
    return {
      id: '',
      userId: user?.id,
      logType: 'dayLog',
      title: `${dayjs(this_date).format('MMMM DD')}  - ${dayjs(
        this_date,
      ).format('dddd')}`,
      date: dayjs(this_date).format('YYYY-MM-DD'),
      createdAt: new Date(),
      updatedAt: new Date(),
      works: DEFAULT_MARKDOWN_DATA as any[],
    };
  },
};

/**
 * Every worklog save, one after another. A day that is opened again waits for
 * its pending save, so it never loads an older copy than the one just left.
 */
export const worklogSaves = {
  queue: Promise.resolve() as Promise<unknown>,
};

const carried = new Map<string, Promise<unknown>>();

/**
 * Moves points still open on earlier days into today, once per day for this
 * page. Days load after it, so they show where the points went.
 */
export const carryOpenPoints = () => {
  const today = dayjs().format('YYYY-MM-DD');
  if (!carried.has(today))
    carried.set(
      today,
      PortalSdk.postData('/api/user/worklogs/carry', { today }).catch(
        () => undefined,
      ),
    );
  return carried.get(today)!;
};
