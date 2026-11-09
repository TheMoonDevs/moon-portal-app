'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type {
  CandidateApplication,
  CandidateSort,
} from '@/app/api/hiring/candidates/route';
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
  updatedAt: string;
  applications: CandidateApplication[];
};
type CandidateOpening = {
  id: string;
  title: string;
  status: JOB_OPENING_STATUS;
};

const tagMeta = (tag: ApplicationTag) => POOL_TAGS.find((t) => t.value === tag);

const SORT_OPTIONS: Array<{ value: CandidateSort; label: string }> = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'applied', label: 'Newest applied' },
  { value: 'oldest', label: 'Oldest applied' },
  { value: 'name', label: 'Name A–Z' },
];

const TAG_COLOR: Partial<Record<ApplicationTag, string>> = {
  TOP: 'text-emerald-300',
  HIRED: 'text-emerald-300',
  KEEP: 'text-violet-300',
};

/** A filter for one opening, with a search box and a list that scrolls. */
const OpeningPicker = ({
  openings,
  value,
  onChange,
}: {
  openings: CandidateOpening[];
  value: string;
  onChange: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = openings.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = openings.filter((o) =>
    words.every((w) => o.title.toLowerCase().includes(w)),
  );
  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setFilter('');
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Opening"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 min-w-[160px] max-w-[260px] items-center gap-2 rounded-lg border bg-neutral-900 px-2.5 text-left text-xs transition-colors',
          value
            ? 'border-white/20 text-neutral-100'
            : 'border-white/10 text-neutral-300 hover:border-white/20',
        )}
      >
        {selected && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{
              backgroundColor: OPENING_STATUS_DOT[selected.status] ?? '#737373',
            }}
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          {selected?.title ?? 'Every opening'}
        </span>
        <Icon name="expand_more" className="text-[16px] text-neutral-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex w-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/60">
          <div className="relative border-b border-white/[0.07] p-2">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-neutral-500"
            />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && shown[0]) pick(shown[0].id);
              }}
              placeholder="Find an opening"
              aria-label="Find an opening"
              className="h-8 w-full rounded-md bg-white/[0.04] pl-8 pr-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
          <ul
            role="listbox"
            className="custom-scrollbar max-h-72 overflow-y-auto p-1"
          >
            {!words.length && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onClick={() => pick('')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-white/[0.06]',
                    !value ? 'text-white' : 'text-neutral-300',
                  )}
                >
                  <Icon
                    name="select_all"
                    className="text-[15px] text-neutral-500"
                  />
                  Every opening
                </button>
              </li>
            )}
            {shown.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  onClick={() => pick(o.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-white/[0.06]',
                    o.id === value
                      ? 'bg-white/[0.06] text-white'
                      : 'text-neutral-300',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        OPENING_STATUS_DOT[o.status] ?? '#737373',
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.title}</span>
                  {o.status !== 'OPEN' && (
                    <span className="text-[10px] text-neutral-500">
                      {OPENING_STATUS_META[o.status]?.label}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {words.length > 0 && !shown.length && (
              <li className="px-2.5 py-2 text-xs text-neutral-500">
                No opening matches.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const OPENING_STATUS_DOT: Partial<Record<JOB_OPENING_STATUS, string>> = {
  OPEN: '#34d399',
  DRAFT: '#737373',
  CLOSED: '#f59e0b',
  ARCHIVED: '#525252',
};

/** Shared by the header and every opening row, so they line up as columns. */
const APP_COLS =
  'grid grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_96px_112px_72px_16px]';
const PERSON_COL = 'sm:w-[34%] sm:shrink-0';

const ColumnHeader = () => (
  <div className="hidden items-center gap-4 border-b border-white/[0.06] px-4 py-2 text-[10px] uppercase tracking-wider text-neutral-500 sm:flex">
    <span className={PERSON_COL}>Candidate</span>
    <div className={cn(APP_COLS, 'flex-1 px-2.5')}>
      <span>Opening</span>
      <span>Source</span>
      <span>Stage</span>
      <span className="text-right">Updated</span>
      <span />
    </div>
  </div>
);

/**
 * One person: who they are on the left (tags and a bounced email as icons
 * after the name), and a row per opening they're in on the right, in
 * columns: the opening, where they came from, the stage, and when it last
 * changed. Clicking a row opens that application.
 */
const CandidateRow = ({
  person,
  openingOf,
  onOpen,
}: {
  person: Person;
  openingOf: Map<string, CandidateOpening>;
  onOpen: (a: CandidateApplication) => void;
}) => {
  const tags = Array.from(new Set(person.applications.flatMap((a) => a.tags)));
  const bounced = person.applications.some(
    (a) =>
      a.lastEmail && EMAIL_STATUS_META[a.lastEmail.status]?.tone === 'danger',
  );

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
      <button
        type="button"
        onClick={() => onOpen(person.applications[0])}
        className={cn(
          'group flex min-w-0 items-center gap-3 text-left',
          PERSON_COL,
        )}
      >
        <UserAvatar name={person.name} size={34} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-neutral-100 group-hover:underline">
              {person.name}
            </span>
            {tags.map((t) => {
              const meta = tagMeta(t);
              return (
                <span key={t} title={meta?.label ?? t} className="flex">
                  <Icon
                    name={meta?.icon ?? 'sell'}
                    className={cn(
                      'shrink-0 text-[15px]',
                      TAG_COLOR[t] ?? 'text-neutral-400',
                    )}
                  />
                </span>
              );
            })}
            {bounced && (
              <span title="An email didn’t arrive" className="flex">
                <Icon
                  name="unsubscribe"
                  className="shrink-0 text-[15px] text-rose-300"
                />
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {person.email}
          </span>
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
              onClick={() => onOpen(a)}
              className={cn(
                APP_COLS,
                'group rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-xs text-neutral-200">
                  {opening?.title ?? 'An opening'}
                  {opening?.status === 'ARCHIVED' && (
                    <span className="text-neutral-500"> · Archived</span>
                  )}
                </span>
                {a.taskSubmitted ? (
                  <span title="Task sent back" className="flex">
                    <Icon
                      name="task_alt"
                      className="text-[14px] text-emerald-300"
                    />
                  </span>
                ) : a.taskOpened ? (
                  <span title="Opened the task" className="flex">
                    <Icon
                      name="visibility"
                      className="text-[14px] text-violet-300"
                    />
                  </span>
                ) : null}
              </span>
              <span className="hidden truncate text-[11px] text-neutral-500 sm:block">
                {a.source && a.source !== 'direct'
                  ? sourceLabel(a.source)
                  : 'Direct'}
              </span>
              <span className="flex">
                <Pill tone={meta?.tone}>{meta?.label}</Pill>
              </span>
              <span className="hidden text-right text-[11px] tabular-nums text-neutral-500 sm:block">
                {timeAgo(a.updatedAt)}
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
};

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
  const [sort, setSort] = useState<CandidateSort>('updated');
  const [showRejected, setShowRejected] = useState(false);
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
      if (sort !== 'updated') params.set('sort', sort);
      if (showRejected) params.set('rejected', '1');
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
  }, [companyId, debounced, openingId, stage, tag, sort, showRejected]);

  useEffect(() => {
    load();
  }, [load]);

  const openingOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o])),
    [openings],
  );
  const filtered = !!(debounced || openingId || stage || tag || showRejected);

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
          <OpeningPicker
            openings={openings}
            value={openingId}
            onChange={setOpeningId}
          />
          <NativeSelect
            aria-label="Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as APPLICATION_STAGE)}
            className="h-8 w-auto min-w-[130px] text-xs"
          >
            <option value="">
              {showRejected ? 'Any stage' : 'Any stage but Rejected'}
            </option>
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
          <button
            type="button"
            role="switch"
            aria-checked={showRejected}
            onClick={() => setShowRejected((v) => !v)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors',
              showRejected
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200',
            )}
          >
            <Icon
              name={showRejected ? 'visibility' : 'visibility_off'}
              className="text-[15px]"
            />
            Rejected
          </button>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOpeningId('');
                setStage('');
                setTag('');
                setShowRejected(false);
              }}
              className="px-1 text-xs text-neutral-400 hover:text-neutral-200"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
            <span>
              {loading
                ? 'Searching…'
                : filtered
                  ? `${total} ${total === 1 ? 'person matches' : 'people match'}`
                  : `${total} ${total === 1 ? 'person' : 'people'} · ${applicationCount} applications`}
              {total > people.length && ` · showing ${people.length}`}
            </span>
            <NativeSelect
              aria-label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value as CandidateSort)}
              className="h-8 w-auto text-xs"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
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
          <>
            <ColumnHeader />
            <ul className="divide-y divide-white/[0.05]">
              {people.map((person) => (
                <CandidateRow
                  key={person.email}
                  person={person}
                  openingOf={openingOf}
                  onOpen={openApplicant}
                />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
};
