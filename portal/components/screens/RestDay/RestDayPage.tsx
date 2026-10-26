'use client';

import dayjs from 'dayjs';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

type State = 'ask' | 'saving' | 'done' | 'error';

/** Mark a day as a rest day, or go log work for it instead. */
export const RestDayPage = () => {
  const params = useSearchParams();
  const date = params?.get('date') || dayjs().format('YYYY-MM-DD');
  const markNow = params?.get('mark') === '1';
  const [state, setState] = useState<State>(markNow ? 'saving' : 'ask');
  const started = useRef(false);

  const worklogHref = `${APP_ROUTES.userWorklogs}/new?logType=dayLog&date=${date}`;
  const label = dayjs(date).isSame(dayjs(), 'day')
    ? 'today'
    : dayjs(date).format('dddd, MMM D');

  const markRestDay = useCallback(async () => {
    setState('saving');
    try {
      await PortalSdk.postData('/api/user/worklogs/rest-day', { date });
      setState('done');
    } catch (error) {
      console.error(error);
      setState('error');
    }
  }, [date]);

  useEffect(() => {
    if (!markNow || started.current) return;
    started.current = true;
    markRestDay();
  }, [markNow, markRestDay]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <span className="text-5xl">{state === 'done' ? '🌴' : '🌙'}</span>
      {state === 'done' ? (
        <>
          <h1 className="text-xl font-bold">Enjoy your rest</h1>
          <p className="max-w-xs text-sm text-neutral-500">
            {label[0].toUpperCase() + label.slice(1)} is marked as a rest day.
            If you did work after all, you can still log it.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">No work logged {label}</h1>
          <p className="max-w-xs text-sm text-neutral-500">
            Was it a rest day, or do you want to write down what you did?
          </p>
        </>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-500">
          Could not save that. Please try again.
        </p>
      )}
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        {state !== 'done' && (
          <button
            type="button"
            onClick={markRestDay}
            disabled={state === 'saving'}
            className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {state === 'saving' ? 'Saving…' : 'Mark as rest day'}
          </button>
        )}
        <Link
          href={worklogHref}
          className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-bold text-neutral-900"
        >
          {state === 'done' ? 'Open worklog' : 'Update worklog'}
        </Link>
        {state === 'done' && (
          <Link href="/" className="py-2 text-sm text-neutral-500">
            Go home
          </Link>
        )}
      </div>
    </main>
  );
};
