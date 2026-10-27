'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import { isPersonalLink, PERSONAL_COMPANY } from '@/lib/worklogs/personal';
import type { PointEvent } from '@/lib/worklogs/timeline';
import {
  eventsFor,
  formatSpan,
  POINT_STATUSES,
  pointSpan,
} from '@/lib/worklogs/timeline';
import type { WorklogLink } from '@/models/worklogs';
import { PortalSdk } from '@/utils/services/PortalSdk';

/** Waits for typing to settle before asking the server to link new lines. */
const LINK_DELAY_MS = 4000;
const NOT_PROJECT = '__none';
/** The picker's value for a company's work on none of its projects. */
const COMPANY_PREFIX = 'company:';

const ProjectDot = ({
  project,
}: {
  project?: { logo?: string | null; color?: string | null };
}) =>
  project?.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={project.logo} alt="" className="size-4 rounded object-cover" />
  ) : (
    <span
      className="size-2.5 rounded-full"
      style={{ backgroundColor: project?.color || '#a3a3a3' }}
    />
  );

/** A line on a company but none of its projects. */
const onCompanyOnly = (l: WorklogLink) =>
  !l.projectId && !!l.companyId && !isPersonalLink(l);

/** A project (and task) picker for one line, or the company on its own. */
const LinePicker = ({
  link,
  candidates,
  onPick,
}: {
  link: WorklogLink;
  candidates: LinkCandidates;
  onPick: (
    projectId: string | null,
    taskId: string | null,
    companyId?: string | null,
  ) => void;
}) => {
  const companies = useMemo(
    () =>
      candidates.companies.map((company) => ({
        company,
        projects: candidates.projects.filter((p) => p.companyId === company.id),
      })),
    [candidates.companies, candidates.projects],
  );
  const tasks = candidates.tasks.filter((t) => t.projectId === link.projectId);
  const value = link.projectId
    ? link.projectId
    : onCompanyOnly(link)
      ? `${COMPANY_PREFIX}${link.companyId}`
      : link.source === 'user'
        ? NOT_PROJECT
        : '';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label="Project"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith(COMPANY_PREFIX))
            onPick(null, null, v.slice(COMPANY_PREFIX.length));
          else onPick(v === NOT_PROJECT ? null : v || null, null);
        }}
        className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700"
      >
        {!link.projectId && link.source !== 'user' && (
          <option value="">Pick a project…</option>
        )}
        {companies.map(({ company, projects }) => (
          <optgroup key={company.id} label={company.name}>
            <option value={`${COMPANY_PREFIX}${company.id}`}>
              General ({company.name})
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={NOT_PROJECT}>Not company work</option>
      </select>
      {link.projectId && tasks.length > 0 && (
        <select
          aria-label="Task"
          value={link.taskId ?? ''}
          onChange={(e) => onPick(link.projectId, e.target.value || null)}
          className="h-7 max-w-[200px] rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700"
        >
          <option value="">No specific task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** A point's events, its own and those of the point it is the same as. */
const pointEvents = (link: WorklogLink, timeline: PointEvent[]) =>
  [
    ...eventsFor(timeline, link.key),
    ...(link.sameAs ? eventsFor(timeline, link.sameAs) : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

/** How long a point has taken, and what happened when. */
const PointTimeline = ({ events }: { events: PointEvent[] }) => {
  const [open, setOpen] = useState(false);
  const span = pointSpan(events);
  if (!span) return null;
  const summary = span.finishedAt
    ? `took ${formatSpan(span.startedAt, span.finishedAt)}`
    : `${formatSpan(span.startedAt, new Date().toISOString())} so far`;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 self-start text-[11px] text-neutral-400 hover:text-neutral-600"
      >
        <span className="material-symbols-outlined !text-xs">schedule</span>
        {summary} · {span.updates} {span.updates === 1 ? 'update' : 'updates'}
      </button>
      {open && (
        <ol className="ml-1 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
          {events.map((e, i) => (
            <li
              key={`${e.key}${e.at}${i}`}
              className="text-[11px] text-neutral-500"
            >
              <span className="text-neutral-400">{timeOf(e.at)}</span>{' '}
              {e.status ? `${POINT_STATUSES[e.status].emoji} ` : ''}
              {e.note ??
                (i === 0
                  ? 'Started'
                  : e.status
                    ? POINT_STATUSES[e.status].label
                    : 'Updated')}
              {e.by === 'claude' ? ' · Claude' : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** Links a line the person typed to one of their assistant's points. */
const SameAsPicker = ({
  link,
  points,
  onPick,
}: {
  link: WorklogLink;
  points: WorklogLink[];
  onPick: (sameAs: string | null) => void;
}) => (
  <select
    aria-label="Same work as a Claude point"
    value={link.sameAs ?? ''}
    onChange={(e) => onPick(e.target.value || null)}
    className="h-7 max-w-[200px] rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700"
  >
    <option value="">Not a Claude point</option>
    {points.map((p) => (
      <option key={p.key} value={p.key}>
        Same as: {p.text}
      </option>
    ))}
  </select>
);

/**
 * Where today's lines went: one chip per project, and a short question for
 * any line the linker could not place. Lines are linked on the server a few
 * seconds after each save.
 */
export const WorklogLinks = ({
  worklogId,
  version,
}: {
  worklogId: string;
  /** Changes on every save, which triggers a relink. */
  version: string;
}) => {
  const [links, setLinks] = useState<WorklogLink[]>([]);
  const [candidates, setCandidates] = useState<LinkCandidates>({
    projects: [],
    tasks: [],
    companies: [],
  });
  const [timeline, setTimeline] = useState<PointEvent[]>([]);
  const [claudeKeys, setClaudeKeys] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const loadedFor = useRef<string | null>(null);
  const latestRequest = useRef(0);

  const relink = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const res = await PortalSdk.postData('/api/user/worklogs/links', {
        worklogId,
      });
      // A newer relink (or another day) has replaced this one.
      if (request !== latestRequest.current) return;
      loadedFor.current = worklogId;
      setLinks(res?.data?.links ?? []);
      setTimeline(res?.data?.timeline ?? []);
      setClaudeKeys(res?.data?.claudeKeys ?? []);
      setCandidates({
        projects: res?.data?.projects ?? [],
        tasks: res?.data?.tasks ?? [],
        companies: res?.data?.companies ?? [],
      });
    } catch {
      // Linking is a helper; the worklog itself is already saved.
    }
  }, [worklogId]);

  useEffect(() => {
    clearTimeout(timer.current);
    // A newly opened day shows its links at once; after that, wait for
    // typing to settle.
    const delay = loadedFor.current === worklogId ? LINK_DELAY_MS : 0;
    timer.current = setTimeout(relink, delay);
    return () => clearTimeout(timer.current);
  }, [relink, version, worklogId]);

  const pick = async (
    link: WorklogLink,
    projectId: string | null,
    taskId: string | null,
    companyId: string | null = null,
  ) => {
    const before = links;
    const project = candidates.projects.find((p) => p.id === projectId);
    setLinks((all) =>
      all.map((l) =>
        l.key === link.key
          ? {
              ...l,
              projectId,
              companyId: project?.companyId ?? companyId,
              taskId,
              source: 'user',
              confidence: 1,
            }
          : l,
      ),
    );
    try {
      await PortalSdk.patchData('/api/user/worklogs/links', {
        worklogId,
        key: link.key,
        projectId,
        taskId,
        companyId,
      });
    } catch {
      setLinks(before);
      toast.error('Could not save that. Try again.');
    }
  };

  const linkSameAs = async (link: WorklogLink, sameAs: string | null) => {
    const before = links;
    const target = links.find((l) => l.key === sameAs);
    setLinks((all) =>
      all.map((l) =>
        l.key === link.key
          ? {
              ...l,
              sameAs,
              ...(target &&
                target.source !== 'none' && {
                  projectId: target.projectId,
                  companyId: target.companyId,
                  taskId: target.taskId,
                  source: 'user' as const,
                  confidence: 1,
                }),
            }
          : l,
      ),
    );
    try {
      await PortalSdk.patchData('/api/user/worklogs/links', {
        worklogId,
        key: link.key,
        sameAs,
      });
    } catch {
      setLinks(before);
      toast.error('Could not link that. Try again.');
    }
  };

  const claudePoints = links.filter(
    (l) => claudeKeys.includes(l.key) && !isPersonalLink(l),
  );

  /** One line: its words, how long it has taken, and where it goes. */
  const lineRow = (link: WorklogLink) => {
    const isClaude = claudeKeys.includes(link.key);
    const same = link.sameAs
      ? links.find((l) => l.key === link.sameAs)
      : undefined;
    return (
      <li
        key={link.key}
        className="flex flex-wrap items-start justify-between gap-2 text-xs"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-neutral-600">
            {isClaude && (
              <span className="material-symbols-outlined mr-1 align-middle !text-xs text-neutral-400">
                smart_toy
              </span>
            )}
            {link.text}
          </span>
          {same && (
            <span className="truncate text-[11px] text-neutral-400">
              Same as Claude point: {same.text}
            </span>
          )}
          <PointTimeline events={pointEvents(link, timeline)} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isClaude && claudePoints.length > 0 && (
            <SameAsPicker
              link={link}
              points={claudePoints}
              onPick={(sameAs) => linkSameAs(link, sameAs)}
            />
          )}
          <LinePicker
            link={link}
            candidates={candidates}
            onPick={(p, t, c) => pick(link, p, t, c)}
          />
        </div>
      </li>
    );
  };

  const personal = links.filter(isPersonalLink);
  const unplaced = links.filter(
    (l) => l.source === 'none' && !isPersonalLink(l),
  );
  const byProject = candidates.projects
    .map((project) => ({
      project,
      lines: links.filter((l) => l.projectId === project.id),
    }))
    .filter((g) => g.lines.length);
  const byCompany = candidates.companies
    .map((company) => ({
      company,
      lines: links.filter(
        (l) => onCompanyOnly(l) && l.companyId === company.id,
      ),
    }))
    .filter((g) => g.lines.length);
  if (
    !byProject.length &&
    !byCompany.length &&
    !unplaced.length &&
    !personal.length
  )
    return null;

  const companyKey = (id: string) => `${COMPANY_PREFIX}${id}`;
  const openLines =
    byProject.find((g) => g.project.id === open)?.lines ??
    byCompany.find((g) => companyKey(g.company.id) === open)?.lines;

  return (
    <div className="mx-4 mb-6 mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-widest text-neutral-400">
          Linked to
        </span>
        {byProject.map(({ project, lines }) => (
          <button
            key={project.id}
            type="button"
            onClick={() => setOpen(open === project.id ? null : project.id)}
            title={`${project.companyName} · ${project.name}`}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              open === project.id
                ? 'border-neutral-400 bg-neutral-100 text-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
            )}
          >
            <ProjectDot project={project} />
            {project.name}
            <span className="text-neutral-400">{lines.length}</span>
          </button>
        ))}
        {byCompany.map(({ company, lines }) => (
          <button
            key={company.id}
            type="button"
            onClick={() =>
              setOpen(
                open === companyKey(company.id) ? null : companyKey(company.id),
              )
            }
            title={`${company.name}: work on none of its projects`}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              open === companyKey(company.id)
                ? 'border-neutral-400 bg-neutral-100 text-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
            )}
          >
            <ProjectDot project={company} />
            {company.name} · General
            <span className="text-neutral-400">{lines.length}</span>
          </button>
        ))}
        {personal.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setOpen(open === PERSONAL_COMPANY.id ? null : PERSONAL_COMPANY.id)
            }
            title="Your p: lines. Only you can see them."
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              open === PERSONAL_COMPANY.id
                ? 'border-neutral-400 bg-neutral-100 text-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
            )}
          >
            <span className="material-symbols-outlined !text-sm text-neutral-500">
              lock
            </span>
            {PERSONAL_COMPANY.name}
            <span className="text-neutral-400">{personal.length}</span>
          </button>
        )}
      </div>

      {open === PERSONAL_COMPANY.id && personal.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2">
          <li className="text-[11px] text-neutral-400">
            Only you can see these. Remove “p:” from a line to link it to a
            project.
          </li>
          {personal.map((link) => (
            <li key={link.key} className="truncate text-xs text-neutral-600">
              {link.text}
            </li>
          ))}
        </ul>
      )}

      {openLines && (
        <ul className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2">
          {openLines.map(lineRow)}
        </ul>
      )}

      {unplaced.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-medium text-amber-800">
            Which project or company{' '}
            {unplaced.length === 1 ? 'is this' : 'are these'} for?
          </p>
          <ul className="flex flex-col gap-1.5">{unplaced.map(lineRow)}</ul>
        </div>
      )}
    </div>
  );
};
