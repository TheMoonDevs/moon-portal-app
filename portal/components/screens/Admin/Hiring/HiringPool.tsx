'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { answerText } from '@/lib/hiring/forms';
import { linkParts } from '@/lib/hiring/links';
import { POOL_TAGS, POOL_TEMPLATE_ID, tagMeta } from '@/lib/hiring/pool';
import type {
  ApplicationAnswer,
  ApplicationTag,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type ApplicationRow,
  type HiringSectionProps,
  STAGE_META,
  timeAgo,
} from './hiringMeta';

interface PoolOpening {
  id: string;
  title: string;
  status: JOB_OPENING_STATUS;
  hiringLeadId: string | null;
  replyToLead: boolean;
}

/** The distinct links someone shared across their answers. */
const linksOf = (a: ApplicationRow) =>
  Array.from(
    new Set(
      Object.values(a.answers ?? {}).flatMap((value) =>
        linkParts(answerText(value as ApplicationAnswer))
          .filter((p) => p.href)
          .map((p) => p.href!),
      ),
    ),
  );

const linkLabel = (href: string) => {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname.replace(/\/$/, '');
    return path && path.length < 24 ? `${host}${path}` : host;
  } catch {
    return href;
  }
};

/**
 * Strong people from past openings (top picks, sounds genuine, maybes and
 * people kept on file), searchable by skill and links. One click adds them
 * to a new opening, with a "we thought of you" email.
 */
export const HiringPool = ({
  companyId,
  canEdit,
  openApplicant,
  compose,
}: HiringSectionProps) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tag, setTag] = useState<'ALL' | ApplicationTag>('ALL');
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [openings, setOpenings] = useState<PoolOpening[]>([]);
  const [inOpenings, setInOpenings] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/hiring/pool?${new URLSearchParams({ companyId, q: debounced })}`,
        null,
      );
      setApplications(res?.data?.applications ?? []);
      setOpenings(res?.data?.openings ?? []);
      setInOpenings(res?.data?.inOpenings ?? {});
    } catch (err) {
      toast.error(errorText(err, 'Could not load the talent pool.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const openingOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o])),
    [openings],
  );
  // Openings someone could be added to: not archived.
  const live = openings.filter((o) => o.status !== 'ARCHIVED');

  // One row per person, with each opening they were tagged in.
  const people = useMemo(() => {
    const byEmail = new Map<string, ApplicationRow[]>();
    for (const a of applications) {
      if (tag !== 'ALL' && !a.tags?.includes(tag)) continue;
      byEmail.set(a.email, [...(byEmail.get(a.email) ?? []), a]);
    }
    return Array.from(byEmail.values());
  }, [applications, tag]);

  const counts = Object.fromEntries(
    POOL_TAGS.map((t) => [
      t.value,
      new Set(
        applications
          .filter((a) => a.tags?.includes(t.value))
          .map((a) => a.email),
      ).size,
    ]),
  ) as Record<ApplicationTag, number>;

  const add = async (from: ApplicationRow) => {
    const openingId = target[from.email];
    const opening = openingId ? openingOf.get(openingId) : null;
    if (!opening) return;
    setAdding(from.email);
    try {
      const res = await PortalSdk.postData('/api/hiring/pool', {
        applicationId: from.id,
        openingId,
      });
      const created: ApplicationRow = res.data.application;
      setInOpenings((current) => ({
        ...current,
        [from.email]: [...(current[from.email] ?? []), openingId],
      }));
      setTarget((current) => ({ ...current, [from.email]: '' }));
      toast.success(`${from.name} added to ${opening.title} as Shortlisted`);
      compose({
        recipients: [created],
        opening,
        template: POOL_TEMPLATE_ID,
      });
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by skill, tool, link or name…"
          className="min-w-[220px] flex-1"
        />
        <Segmented
          value={tag}
          onChange={setTag}
          className="max-w-full overflow-x-auto"
          options={[
            { value: 'ALL', label: 'All' },
            ...POOL_TAGS.map((t) => ({
              value: t.value,
              label: t.label,
              icon: t.icon,
              count: counts[t.value],
            })),
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        {loading && !applications.length ? (
          <SkeletonRows rows={5} />
        ) : people.length === 0 ? (
          <EmptyState
            icon="diversity_3"
            title={debounced ? 'Nobody matches' : 'The pool is empty'}
            description={
              debounced
                ? 'Try another skill, tool or link.'
                : 'Tag applicants as Top pick, Sounds genuine, Maybe or Keep on file from their panel, and they stay here after their opening closes.'
            }
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {people.map((rows) => {
              const first = rows[0];
              const tags = Array.from(
                new Set(rows.flatMap((a) => a.tags ?? [])),
              );
              const links = Array.from(new Set(rows.flatMap(linksOf))).slice(
                0,
                5,
              );
              const already = new Set(inOpenings[first.email] ?? []);
              const choices = live.filter((o) => !already.has(o.id));
              return (
                <li
                  key={first.email}
                  className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">
                        {first.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {first.email}
                      </span>
                      {tags.map((t) => {
                        const meta = tagMeta(t);
                        return (
                          <Pill
                            key={t}
                            icon={meta?.icon}
                            tone={
                              t === 'TOP'
                                ? 'positive'
                                : t === 'KEEP'
                                  ? 'purple'
                                  : 'neutral'
                            }
                          >
                            {meta?.label}
                          </Pill>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {rows.map((a) => {
                        const opening = openingOf.get(a.openingId);
                        const stage = STAGE_META[a.stage];
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => openApplicant(a)}
                            className="flex items-center gap-1.5 text-left text-xs text-neutral-400 hover:text-neutral-200"
                          >
                            <Icon name="work_history" className="text-[14px]" />
                            {opening?.title ?? 'An opening'}
                            {opening?.status === 'ARCHIVED'
                              ? ' (archived)'
                              : ''}{' '}
                            · {stage?.label} · applied {timeAgo(a.submittedAt)}
                          </button>
                        );
                      })}
                    </div>
                    {links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {links.map((href) => (
                          <a
                            key={href}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-sky-300 hover:border-white/25"
                          >
                            <Icon name="link" className="text-[12px]" />
                            {linkLabel(href)}
                          </a>
                        ))}
                      </div>
                    )}
                    {first.notes && (
                      <p className="mt-2 line-clamp-2 text-xs text-neutral-500">
                        {first.notes}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <NativeSelect
                        aria-label={`Add ${first.name} to an opening`}
                        value={target[first.email] ?? ''}
                        onChange={(e) =>
                          setTarget((current) => ({
                            ...current,
                            [first.email]: e.target.value,
                          }))
                        }
                        disabled={!choices.length}
                        className="h-8 w-48 text-xs"
                      >
                        <option value="">
                          {choices.length
                            ? 'Add to opening…'
                            : 'In every opening'}
                        </option>
                        {choices.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                      </NativeSelect>
                      <AdminButton
                        size="sm"
                        tone="primary"
                        icon="person_add"
                        disabled={!target[first.email]}
                        loading={adding === first.email}
                        onClick={() => add(first)}
                      >
                        Add
                      </AdminButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="text-[11px] text-neutral-600">
        Adding someone copies their answers to the new opening where it asks the
        same question, moves them to Shortlisted and opens the “We thought of
        you” email to send.
      </p>
    </div>
  );
};
