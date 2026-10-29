'use client';

import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import type {
  ActivityData,
  AgendaData,
  PagePerson,
  WorkData,
  WorkPoint,
} from '@/lib/people/types';
import { cn } from '@/lib/utils';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  EmptyState,
  Icon,
  Segmented,
  Spin,
  UserAvatar,
} from '../Admin/shared/AdminUI';
import { CompanyMark, errorText } from '../Admin/Workspace/shared';
import { ActivityGrid } from './ActivityGrid';
import { AgendaPanel } from './AgendaPanel';
import { type Period, periodOf } from './work';
import { WorkView } from './WorkView';

/*
 * A person's page: what they worked on (by company, project and task, with
 * how long it took), and what is ahead of them (tasks, plan steps, repeating
 * tasks and meetings) on a calendar.
 */

const Header = ({
  person,
  isSelf,
}: {
  person: PagePerson | null;
  isSelf: boolean;
}) => (
  <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-neutral-950/80 px-4 text-sm backdrop-blur-xl">
    <Link
      href={APP_ROUTES.home}
      aria-label="Home"
      className="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon name="arrow_back" className="text-[18px]" />
    </Link>
    <span className="truncate font-medium text-neutral-200">
      {isSelf ? 'Your page' : (person?.name ?? 'Person')}
    </span>
    <div className="flex-1" />
    {isSelf && (
      <Link
        href={APP_ROUTES.userWorklogs}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
      >
        <Icon name="edit_note" className="text-[16px]" />
        <span className="hidden sm:inline">Today’s worklog</span>
        <span className="sm:hidden">Worklog</span>
      </Link>
    )}
  </header>
);

const Profile = ({
  person,
  companies,
}: {
  person: PagePerson | null;
  companies: WorkData['companies'];
}) => (
  <div className="flex min-w-0 items-center gap-4">
    <UserAvatar
      src={person?.avatar}
      name={person?.name}
      size={64}
      className="ring-4 ring-white/[0.03]"
    />
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-bold tracking-tight text-white md:text-[28px]">
        {person?.name ?? (
          <span className="inline-block h-7 w-48 animate-pulse rounded bg-white/[0.06]" />
        )}
      </h1>
      <p className="mt-0.5 truncate text-sm text-neutral-500">
        {[person?.positionTitle, person?.username && `@${person.username}`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {companies.filter((c) => !c.isPersonal).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {companies
            .filter((c) => !c.isPersonal)
            .map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] py-0.5 pl-0.5 pr-2.5 text-[11px] text-neutral-300"
              >
                <CompanyMark
                  name={c.name}
                  color={c.color}
                  logo={c.logo}
                  size={18}
                />
                {c.name}
              </span>
            ))}
        </div>
      )}
    </div>
  </div>
);

type Tab = 'work' | 'ahead';

export const UserPage = ({ userId }: { userId?: string }) => {
  const { user } = useUser();
  const personId = userId ?? user?.id;
  const isSelf = !!user?.id && personId === user.id;

  const [period, setPeriod] = useState<Period>(() => periodOf('week', dayjs()));
  const [work, setWork] = useState<WorkData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [agenda, setAgenda] = useState<AgendaData | null>(null);
  const [person, setPerson] = useState<PagePerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('work');

  useEffect(() => {
    if (!personId) return;
    setWork(null);
    PortalSdk.getData(
      `/api/people/${personId}/work?from=${period.from}&to=${period.to}`,
      null,
    )
      .then((res) => {
        setWork(res.data);
        setPerson(res.data.person);
      })
      .catch((err) => setError(errorText(err, 'Could not load this page.')));
  }, [personId, period.from, period.to]);

  useEffect(() => {
    if (!personId) return;
    PortalSdk.getData(`/api/people/${personId}/activity`, null)
      .then((res) => setActivity(res.data))
      .catch(() => setActivity({ from: '', to: '', days: {} }));
  }, [personId]);

  const loadAgenda = useCallback(() => {
    if (!personId) return;
    PortalSdk.getData(`/api/people/${personId}/agenda`, null)
      .then((res) => setAgenda(res.data))
      .catch(() =>
        setAgenda({
          isSelf: false,
          tasks: [],
          steps: [],
          plans: [],
          schedules: [],
          meetings: null,
          projects: [],
          companies: [],
        }),
      );
  }, [personId]);
  useEffect(loadAgenda, [loadAgenda]);

  const tickTask = async (taskId: string) => {
    const before = agenda;
    const task = agenda?.tasks.find((t) => t.id === taskId);
    setAgenda(
      (a) => a && { ...a, tasks: a.tasks.filter((t) => t.id !== taskId) },
    );
    try {
      await PortalSdk.patchData(`/api/tasks/${taskId}`, { status: 'DONE' });
      toast.success(task ? `Done: ${task.title}` : 'Task done');
    } catch (err) {
      setAgenda(before);
      toast.error(errorText(err, 'Could not mark it done.'));
    }
  };

  // One click on a point's status, on your own page.
  const setPointStatus = async (point: WorkPoint, status: PointStatus) => {
    try {
      // A point is a task: the task moves, and the move is logged on it.
      await PortalSdk.postData('/api/me/day/points', {
        taskId: point.taskId ?? point.key,
        status,
        text: '',
      });
      const res = await PortalSdk.getData(
        `/api/people/${personId}/work?from=${period.from}&to=${period.to}`,
        null,
      );
      setWork(res.data);
      toast.success(`${POINT_STATUSES[status].emoji} ${point.text}`);
    } catch (err) {
      toast.error(errorText(err, 'Could not change that point.'));
      throw err;
    }
  };

  if (error)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 md:left-16">
        <EmptyState
          icon="person_off"
          title="We couldn’t open this page"
          description={error}
          action={
            <Link href={APP_ROUTES.home} className="text-sm text-sky-300">
              Back home
            </Link>
          }
        />
      </div>
    );

  if (!personId)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 md:left-16">
        <Spin className="size-5" />
      </div>
    );

  // A square in the activity grid opens that day.
  const pickDay = (day: string) => setPeriod(periodOf('day', dayjs(day)));

  return (
    <div className="custom-scrollbar fixed inset-0 overflow-y-auto bg-neutral-950 pb-[72px] text-neutral-100 md:left-16 md:pb-0">
      <Header person={person} isSelf={isSelf} />

      <motion.main
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 md:px-8 md:pt-10"
      >
        <div className="mb-8 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Profile person={person} companies={work?.companies ?? []} />
          <ActivityGrid data={activity} selected={period} onPick={pickDay} />
        </div>

        <Segmented
          className="mb-5 w-full lg:hidden [&>button]:flex-1 [&>button]:justify-center"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'work', label: 'Work', icon: 'insights' },
            { value: 'ahead', label: 'Up next', icon: 'event_upcoming' },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className={cn('min-w-0', tab !== 'work' && 'hidden lg:block')}>
            <WorkView
              data={work}
              period={period}
              onPeriod={setPeriod}
              onPointStatus={isSelf ? setPointStatus : undefined}
            />
          </div>
          <aside
            className={cn(
              'min-w-0 lg:sticky lg:top-16 lg:self-start',
              tab !== 'ahead' && 'hidden lg:block',
            )}
          >
            <AgendaPanel agenda={agenda} canTick={isSelf} onTick={tickTask} />
          </aside>
        </div>
      </motion.main>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
