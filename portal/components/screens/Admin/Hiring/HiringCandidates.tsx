'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { CandidateApplication } from '@/app/api/hiring/candidates/route';
import { APPLICATION_STAGES } from '@/lib/hiring/forms';
import { POOL_TAGS } from '@/lib/hiring/pool';
import { sourceLabel } from '@/lib/hiring/sources';
import { cn } from '@/lib/utils';
import type {
  APPLICATION_STAGE,
  ApplicationTag,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  EmptyState,
  Icon,
  inputBase,
  NativeSelect,
  Panel,
  Pill,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  EMAIL_STATUS_META,
  type HiringSectionProps,
  OPENING_STATUS_META,
  STAGE_META,
  timeAgo,
} from './hiringMeta';

type Person = {
  email: string;
  name: string;
  latestAt: string;
  applications: CandidateApplication[];
};
type CandidateOpening = {
  id: string;
  title: string;
  status: JOB_OPENING_STATUS;
};

const tagMeta = (tag: ApplicationTag) => POOL_TAGS.find((t) => t.value === tag);

/**
 * Everyone who applied, across every opening: one search over names,
 * emails, answers, links and notes, one row per person with each opening
 * they're in and where they stand there.
 */
export const HiringCandidates = ({
  companyId,
  openApplicant,
  focusSignal,
}: HiringSectionProps & {
  /** Changes when the search box should take focus (e.g. pressing /). */
  focusSignal?: number;
}) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [stage, setStage] = useState<APPLICATION_STAGE | ''>('');
  const [tag, setTag] = useState<ApplicationTag | ''>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [openings, setOpenings] = useState<CandidateOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        e.key !== '/' ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId, q: debounced });
      if (openingId) params.set('openingId', openingId);
      if (stage) params.set('stage', stage);
      if (tag) params.set('tag', tag);
      const res = await PortalSdk.getData(
        `/api/hiring/candidates?${params}`,
        null,
      );
      setPeople(res?.data?.people ?? []);
      setTotal(res?.data?.total ?? 0);
      setApplicationCount(res?.data?.applications ?? 0);
      setOpenings(res?.data?.openings ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load candidates.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, debounced, openingId, stage, tag]);

  useEffect(() => {
    load();
  }, [load]);

  const openingOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o])),
    [openings],
  );
  const filtered = !!(debounced || openingId || stage || tag);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-neutral-500"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search every opening by name, email, skill, link or note…"
            aria-label="Search candidates"
            className={cn(inputBase, 'h-12 rounded-xl pl-11 pr-20 text-[15px]')}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[18px] text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
            >
              <Icon name="close" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-neutral-500">
              /
            </kbd>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Opening"
            value={openingId}
            onChange={(e) => setOpeningId(e.target.value)}
            className="h-8 w-auto min-w-[160px] text-xs"
          >
            <option value="">Every opening</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
                {o.status === 'ARCHIVED' ? ' (archived)' : ''}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as APPLICATION_STAGE)}
            className="h-8 w-auto min-w-[130px] text-xs"
          >
            <option value="">Any stage</option>
            {APPLICATION_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_META[s].label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value as ApplicationTag)}
            className="h-8 w-auto min-w-[130px] text-xs"
          >
            <option value="">Any tag</option>
            {POOL_TAGS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOpeningId('');
                setStage('');
                setTag('');
              }}
              className="px-1 text-xs text-neutral-400 hover:text-neutral-200"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-neutral-500">
            {loading
              ? 'Searching…'
              : filtered
                ? `${total} ${total === 1 ? 'person matches' : 'people match'}`
                : `${total} ${total === 1 ? 'person' : 'people'} · ${applicationCount} applications`}
            {total > people.length && ` · showing ${people.length}`}
          </span>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {loading && !people.length ? (
          <SkeletonRows rows={6} />
        ) : people.length === 0 ? (
          <EmptyState
            icon="person_search"
            title={filtered ? 'Nobody matches' : 'No candidates yet'}
            description={
              filtered
                ? 'Try a different word, or clear the filters.'
                : 'People who apply to any opening show up here.'
            }
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {people.map((person) => {
              const tags = Array.from(
                new Set(person.applications.flatMap((a) => a.tags)),
              );
              const bounced = person.applications.find(
                (a) =>
                  a.lastEmail &&
                  EMAIL_STATUS_META[a.lastEmail.status]?.tone === 'danger',
              );
              return (
                <li
                  key={person.email}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start"
                >
                  <button
                    type="button"
                    onClick={() => openApplicant(person.applications[0])}
                    className="flex min-w-0 items-start gap-3 text-left sm:w-[38%] sm:shrink-0"
                  >
                    <UserAvatar name={person.name} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-100 hover:underline">
                        {person.name}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {person.email}
                      </span>
                      {(tags.length > 0 || bounced) && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {tags.map((t) => {
                            const meta = tagMeta(t);
                            return (
                              <Pill
                                key={t}
                                icon={meta?.icon}
                                tone={
                                  t === 'TOP' || t === 'HIRED'
                                    ? 'positive'
                                    : t === 'KEEP'
                                      ? 'purple'
                                      : 'neutral'
                                }
                              >
                                {meta?.label ?? t}
                              </Pill>
                            );
                          })}
                          {bounced && (
                            <Pill tone="danger" icon="unsubscribe">
                              Email didn’t arrive
                            </Pill>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {person.applications.map((a) => {
                      const opening = openingOf.get(a.openingId);
                      const meta = STAGE_META[a.stage];
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => openApplicant(a)}
                          className="group flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                        >
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: meta?.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-neutral-200">
                            {opening?.title ?? 'An opening'}
                            {opening?.status === 'ARCHIVED' && (
                              <span className="text-neutral-500">
                                {' '}
                                ·{' '}
                                {OPENING_STATUS_META.ARCHIVED?.label ??
                                  'Archived'}
                              </span>
                            )}
                          </span>
                          {a.taskSubmitted ? (
                            <Icon
                              name="task_alt"
                              className="text-[14px] text-emerald-300"
                            />
                          ) : a.taskOpened ? (
                            <Icon
                              name="visibility"
                              className="text-[14px] text-violet-300"
                            />
                          ) : null}
                          {a.source && a.source !== 'direct' && (
                            <span className="hidden text-[10px] text-neutral-500 md:inline">
                              {sourceLabel(a.source)}
                            </span>
                          )}
                          <Pill tone={meta?.tone}>{meta?.label}</Pill>
                          <span className="hidden w-16 shrink-0 text-right text-[10px] text-neutral-500 sm:inline">
                            {timeAgo(a.submittedAt)}
                          </span>
                          <Icon
                            name="chevron_right"
                            className="text-[16px] text-neutral-600 group-hover:text-neutral-300"
                          />
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};
