'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';
import { AvatarStack, CompanyMark } from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';
import {
  monthName,
  type OverviewCompany,
  type OverviewProject,
  type Pulse,
  pulseOf,
  PULSES,
} from './overview';
import { Tip, TipRow, TipTitle } from './Tip';

const MAX_ROWS = 5;

const StatTile = ({
  value,
  label,
  hint,
}: {
  value: React.ReactNode;
  label: string;
  hint: string;
}) => (
  <Tip content={hint}>
    <div
      tabIndex={0}
      className="flex-1 cursor-help rounded-xl bg-white/[0.03] px-3 py-2 outline-none focus-visible:bg-white/[0.06]"
    >
      <p className="text-xl font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      <p className="truncate text-[11px] text-neutral-500">{label}</p>
    </div>
  </Tip>
);

/** A thin bar filled to its share of the largest value. */
const Bar = ({ share, color }: { share: number; color: string }) => (
  <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
    <motion.span
      className="absolute inset-y-0 left-0 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(share > 0 ? 4 : 0, share * 100)}%` }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    />
  </span>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
    {children}
  </p>
);

/**
 * A company's bar on projects Home: its logo, basics and Core / Edit
 * buttons on the left, then how it is doing this month: what got done, how
 * much work was logged each day, how many of its projects are moving, quiet
 * or need a look, and how each member is contributing.
 */
export const CompanyBar = ({
  company,
  all,
  people,
  editHref,
}: {
  company: OverviewCompany;
  all: OverviewProject[];
  people: Map<string, Person>;
  /** Where its Edit button goes, for people who may edit the company. */
  editHref?: string | null;
}) => {
  const color = company.color || '#10b981';
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const month = monthName(now);

  const { daily, members, quiet, totals } = useMemo(() => {
    const mine = all.filter((p) => p.companyId === company.id);
    const daily = Array.from({ length: daysInMonth }, () => 0);
    const byPerson = new Map<string, { logged: number; done: number }>();
    for (const p of mine) {
      p.month?.days.forEach((n, i) => (daily[i] += n));
      for (const row of p.month?.people ?? []) {
        const at = byPerson.get(row.userId) ?? { logged: 0, done: 0 };
        at.logged += row.logged;
        at.done += row.done;
        byPerson.set(row.userId, at);
      }
    }
    const members = Array.from(byPerson, ([id, row]) => ({
      person: people.get(id),
      ...row,
    }))
      .filter(
        (m): m is typeof m & { person: Person } =>
          !!m.person && m.logged + m.done > 0,
      )
      .sort((a, b) => b.logged - a.logged || b.done - a.done);
    const quiet = (company.memberIds ?? [])
      .filter((id) => !members.some((m) => m.person.id === id))
      .map((id) => people.get(id))
      .filter((p): p is Person => !!p);
    return {
      daily,
      members,
      quiet,
      totals: {
        done: mine.reduce((n, p) => n + (p.month?.done ?? 0), 0),
        major: mine.reduce((n, p) => n + (p.month?.major ?? 0), 0),
        logged: daily.reduce((n, d) => n + d, 0),
        open: mine.reduce((n, p) => n + p.tasks.open, 0),
        overdue: mine.reduce((n, p) => n + p.tasks.overdue, 0),
      },
    };
  }, [all, company, people, daysInMonth]);

  const today = now.getDate();
  const peak = Math.max(1, ...daily);
  const maxMember = Math.max(1, ...members.map((m) => m.logged));
  const memberCount = company.memberIds?.length ?? members.length;
  const companyProjects = all.filter((p) => p.companyId === company.id);
  const activeCount = companyProjects.filter(
    (p) => p.status === 'ACTIVE',
  ).length;
  const core = companyProjects.find((p) => p.isCore);
  const byPulse = (Object.keys(PULSES) as Pulse[]).map((key) => ({
    key,
    projects: companyProjects.filter((p) => pulseOf(p) === key),
  }));

  return (
    <div className="mb-3 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.035] to-white/[0.01] lg:flex-row">
      {/* Who the company is */}
      <div
        className="relative isolate flex shrink-0 flex-col gap-3 overflow-hidden border-b border-white/[0.06] p-5 lg:w-60 lg:border-b-0 lg:border-r"
        style={{
          background: `linear-gradient(160deg, ${color}26, transparent 70%)`,
        }}
      >
        {company.banner && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.banner}
              alt=""
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 w-full object-cover opacity-60 lg:h-32"
            />
            <span className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-transparent to-neutral-950 lg:h-32" />
          </>
        )}
        <div
          className={cn(
            'flex items-center gap-3 lg:flex-col lg:items-start',
            company.banner && 'pt-10',
          )}
        >
          <CompanyMark
            name={company.name}
            color={company.color}
            logo={company.logo}
            size={72}
          />
          <h2 className="text-xl font-bold leading-tight tracking-tight text-white">
            {company.name}
          </h2>
        </div>
        {company.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-neutral-400">
            {company.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-400">
          {company.isPersonal ? (
            <span className="flex items-center gap-1.5">
              <Icon name="lock" className="text-[15px] text-neutral-500" />
              Only you
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Icon name="group" className="text-[15px] text-neutral-500" />
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Icon name="folder" className="text-[15px] text-neutral-500" />
            {companyProjects.length} project
            {companyProjects.length === 1 ? '' : 's'}
            {activeCount < companyProjects.length && ` · ${activeCount} active`}
          </span>
        </div>
        <div className="flex gap-2">
          {core && (
            <Link
              href={`${APP_ROUTES.projects}/${core.id}`}
              title={`Open ${company.name}'s core project`}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            >
              <Icon name="hub" className="text-[16px]" />
              Core
            </Link>
          )}
          {editHref && (
            <Link
              href={editHref}
              title={`Edit ${company.name}: name, logo, banner, colour, members`}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs font-semibold text-neutral-200 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Icon name="edit" className="text-[16px]" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid min-w-0 flex-1 gap-5 p-4 md:grid-cols-2 xl:grid-cols-3">
        {/* The month in numbers, and each day of it */}
        <div className="flex min-w-0 flex-col gap-3">
          <Heading>{month} so far</Heading>
          <div className="-mt-2 flex gap-2">
            <StatTile
              value={totals.done}
              label="tasks done"
              hint={`Tasks finished in ${month}${totals.major ? `, ${totals.major} of them major` : ''}. ${totals.open} still open.`}
            />
            <StatTile
              value={totals.logged}
              label="work points"
              hint="Work points logged on its projects this month: one for each person, task and day."
            />
            <StatTile
              value={
                <>
                  {members.length}
                  <span className="text-sm font-medium text-neutral-500">
                    /{memberCount}
                  </span>
                </>
              }
              label="active"
              hint="Members who logged or finished work this month, of the company's members."
            />
          </div>
          <div
            className="flex h-16 items-end gap-[2px]"
            role="img"
            aria-label={`Work logged each day of ${month}, ${totals.logged} in all`}
          >
            {daily.map((n, i) => {
              const future = i + 1 > today;
              return (
                <Tip
                  key={i}
                  content={
                    future ? (
                      `${month} ${i + 1}`
                    ) : (
                      <>
                        <TipTitle>
                          {month} {i + 1}
                          {i + 1 === today && ' (today)'}
                        </TipTitle>
                        {n
                          ? `${n} work point${n === 1 ? '' : 's'} logged`
                          : 'Nothing logged'}
                      </>
                    )
                  }
                >
                  <span className="flex h-full flex-1 cursor-default items-end">
                    <motion.span
                      className={cn(
                        'w-full rounded-t-[3px]',
                        future || !n ? 'bg-white/[0.06]' : '',
                        i + 1 === today && 'ring-1 ring-white/30',
                      )}
                      style={
                        !future && n
                          ? {
                              backgroundColor: color,
                              opacity: 0.45 + 0.55 * (n / peak),
                            }
                          : {}
                      }
                      initial={{ height: 0 }}
                      animate={{
                        height:
                          future || !n
                            ? 3
                            : `${Math.max(8, (n / peak) * 100)}%`,
                      }}
                      transition={{ duration: 0.5, delay: i * 0.01 }}
                    />
                  </span>
                </Tip>
              );
            })}
          </div>
          <div className="-mt-2 flex justify-between text-[10px] text-neutral-600">
            <span>1</span>
            <span>{daysInMonth}</span>
          </div>
        </div>

        {/* How its projects are doing, by count (the list is on the left) */}
        <div className="min-w-0">
          <Heading>Projects</Heading>
          <div className="grid grid-cols-2 gap-2">
            {byPulse.map(({ key, projects: list }) => (
              <Tip
                key={key}
                content={
                  <>
                    <TipTitle>{PULSES[key].label}</TipTitle>
                    <p>{PULSES[key].hint}</p>
                    {list.length > 0 && (
                      <p className="mt-1.5 text-neutral-400">
                        {list.map((p) => p.name).join(', ')}
                      </p>
                    )}
                  </>
                }
              >
                <div
                  tabIndex={0}
                  className={cn(
                    'cursor-help rounded-xl bg-white/[0.03] px-3 py-2 outline-none focus-visible:bg-white/[0.06]',
                    !list.length && 'opacity-50',
                  )}
                >
                  <p className="flex items-center gap-2 text-xl font-semibold tabular-nums tracking-tight text-white">
                    {list.length}
                    <span
                      className={cn('size-1.5 rounded-full', PULSES[key].dot)}
                    />
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {PULSES[key].label.toLowerCase()}
                  </p>
                </div>
              </Tip>
            ))}
          </div>
          {totals.overdue > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300/90">
              <Icon name="schedule" className="text-[14px]" />
              {totals.overdue} overdue task{totals.overdue === 1 ? '' : 's'}{' '}
              across its projects
            </p>
          )}
        </div>

        {/* People, by work logged this month */}
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <Heading>People</Heading>
          {members.length ? (
            <div className="flex flex-col gap-1">
              {members.slice(0, MAX_ROWS).map((m) => (
                <Tip
                  key={m.person.id}
                  content={
                    <>
                      <TipTitle>
                        {m.person.name} in {month}
                      </TipTitle>
                      <TipRow label="Work logged" value={m.logged} />
                      <TipRow label="Tasks finished" value={m.done} />
                    </>
                  }
                >
                  <span
                    tabIndex={0}
                    className="-mx-1.5 flex cursor-help items-center gap-2.5 rounded-lg px-1.5 py-0.5 text-xs outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06]"
                  >
                    <UserAvatar
                      src={m.person.avatar}
                      name={m.person.name}
                      size={20}
                    />
                    <span className="w-[74px] shrink-0 truncate text-neutral-300">
                      {m.person.name?.split(' ')[0]}
                    </span>
                    <Bar share={m.logged / maxMember} color="#a3a3a3" />
                    <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">
                      {m.done} done
                    </span>
                  </span>
                </Tip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Nobody has logged work yet this month.
            </p>
          )}
          {(members.length > MAX_ROWS || quiet.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-neutral-500">
              {members.length > MAX_ROWS && (
                <span>+{members.length - MAX_ROWS} more active</span>
              )}
              {quiet.length > 0 && (
                <Tip
                  content={
                    <>
                      <TipTitle>Nothing logged in {month}</TipTitle>
                      {quiet.map((p) => p.name).join(', ')}
                    </>
                  }
                >
                  <span
                    tabIndex={0}
                    className="flex cursor-help items-center gap-1.5 opacity-70 outline-none"
                  >
                    <AvatarStack users={quiet} max={4} />
                    {quiet.length} quiet
                  </span>
                </Tip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
