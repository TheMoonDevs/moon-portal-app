import dayjs from 'dayjs';

import type { LinkCandidates } from '@/lib/worklogs/linker';
import type { PointOrigin } from '@/lib/worklogs/origin';
import { originOf } from '@/lib/worklogs/origin';
import type { PointEvent } from '@/lib/worklogs/timeline';
import { eventsFor } from '@/lib/worklogs/timeline';
import type { WorklogLink } from '@/models/worklogs';

import type { Row } from './rows';
import { isPoint, rowKey } from './rows';
import type { LinkedTask } from './useDayLog';

/*
 * How the day's rows show: one sheet in the order they were written, each
 * point with the project it is in, the assistant's lines under the point
 * they are part of, and where each point came from. Pure.
 */

export type PointView = {
  row: Row;
  link: WorklogLink | null;
  task: LinkedTask | null;
  origin: PointOrigin | null;
  /** The assistant's lines that are part of this point. */
  subs: SubView[];
  /** An assistant's point with nowhere to go yet: it asks with a "?". */
  asks: boolean;
  /** Where the point is: its project, company, or nowhere yet. */
  place: Place;
};

export type SubView = {
  row: Row;
  link: WorklogLink | null;
  events: PointEvent[];
};

export type Place = Omit<GroupView, 'points'>;

export type GroupView = {
  /** `p:<projectId>`, `c:<companyId>`, `none` or `personal`. */
  id: string;
  kind: 'project' | 'company' | 'none' | 'personal';
  name: string;
  hint?: string;
  color?: string | null;
  /** The section new points in this group are written into. */
  section: string;
  companyId?: string;
  points: PointView[];
};

const NO_PLACE: Place = {
  id: 'none',
  kind: 'none',
  name: 'Not on a project yet',
  section: 'general',
};

const PROJECT_SECTIONS_EXCLUDED = new Set(['general', 'claude']);

export function linkOf(row: Row, byKey: Map<string, WorklogLink>) {
  return (
    byKey.get(rowKey(row)) ??
    (row.syncedKey ? byKey.get(row.syncedKey) : undefined) ??
    null
  );
}

export function buildDay({
  rows,
  byKey,
  timeline,
  linkedTasks,
  candidates,
  date,
}: {
  rows: Row[];
  byKey: Map<string, WorklogLink>;
  timeline: PointEvent[];
  linkedTasks: LinkedTask[];
  candidates: LinkCandidates;
  date: string;
}) {
  const startMs = dayjs(date).startOf('day').valueOf();
  const taskById = new Map(linkedTasks.map((t) => [t.id, t]));
  const projectById = new Map(candidates.projects.map((p) => [p.id, p]));
  const companyById = new Map(candidates.companies.map((c) => [c.id, c]));

  const shown = rows.filter((r) => !r.filler);
  const people = shown.filter((r) => !r.claude);
  const claude = shown.filter((r) => r.claude);

  const originFor = (row: Row, link: WorklogLink | null) => {
    const events = eventsFor(timeline, rowKey(row)).concat(
      row.syncedKey && row.syncedKey !== rowKey(row)
        ? eventsFor(timeline, row.syncedKey)
        : [],
    );
    const task = link?.taskId ? (taskById.get(link.taskId) ?? null) : null;
    const known = originOf({ day: date, startMs, events, task });
    if (known) return known;
    // Not saved yet: it is being written now.
    return Date.now() < startMs ? 'planned' : 'unexpected';
  };

  const views = new Map<string, PointView>();
  for (const row of people) {
    const link = linkOf(row, byKey);
    views.set(row.id, {
      row,
      link,
      task: link?.taskId ? (taskById.get(link.taskId) ?? null) : null,
      origin: isPoint(row) ? originFor(row, link) : null,
      subs: [],
      asks: false,
      place: NO_PLACE,
    });
  }

  // The assistant's lines: under the point they are part of, if any.
  const loose: Row[] = [];
  for (const row of claude) {
    const link = linkOf(row, byKey);
    const key = rowKey(row);
    const parent =
      people.find((p) => link?.parentKey && rowKey(p) === link.parentKey) ??
      people.find((p) => linkOf(p, byKey)?.sameAs === key) ??
      (link?.taskId
        ? people.find((p) => linkOf(p, byKey)?.taskId === link.taskId)
        : undefined);
    if (parent)
      views.get(parent.id)!.subs.push({
        row,
        link,
        events: eventsFor(timeline, key),
      });
    else loose.push(row);
  }
  for (const row of loose) {
    const link = linkOf(row, byKey);
    views.set(row.id, {
      row,
      link,
      task: link?.taskId ? (taskById.get(link.taskId) ?? null) : null,
      origin: originFor(row, link),
      subs: [],
      asks: !link?.taskId,
      place: NO_PLACE,
    });
  }

  const groups = new Map<string, GroupView>();
  const groupFor = (view: PointView): GroupView => {
    const { row, link } = view;
    if (row.isPrivate)
      return {
        id: 'personal',
        kind: 'personal',
        name: 'Personal',
        hint: 'Only you see these',
        section: 'general',
        points: [],
      };
    const sectionProject =
      !PROJECT_SECTIONS_EXCLUDED.has(row.section) &&
      projectById.get(row.section)
        ? row.section
        : null;
    const projectId = link?.projectId ?? sectionProject;
    if (projectId) {
      const project = projectById.get(projectId);
      const company = project ? companyById.get(project.companyId) : null;
      return {
        id: `p:${projectId}`,
        kind: 'project',
        name: project?.name ?? 'A project',
        hint: company?.name ?? project?.companyName,
        color: project?.color,
        section: projectId,
        points: [],
      };
    }
    const companyId =
      link?.companyId && link.companyId !== 'personal'
        ? link.companyId
        : row.place?.companyId;
    if (companyId) {
      const company = companyById.get(companyId);
      return {
        id: `c:${companyId}`,
        kind: 'company',
        name: company?.name ?? 'Company',
        hint: 'Company work, on none of its projects',
        color: company?.color,
        section: 'general',
        companyId,
        points: [],
      };
    }
    return {
      id: 'none',
      kind: 'none',
      name: 'Not on a project yet',
      section: 'general',
      points: [],
    };
  };

  // In the order the rows are in, so a new row stays where it was added.
  for (const row of shown) {
    const view = views.get(row.id);
    if (!view) continue;
    const group = groupFor(view);
    view.place = { ...group, points: undefined } as Place;
    const seen = groups.get(group.id) ?? group;
    seen.points.push(view);
    groups.set(group.id, seen);
  }

  const rank = (g: GroupView) =>
    g.kind === 'project'
      ? 0
      : g.kind === 'company'
        ? 1
        : g.kind === 'none'
          ? 2
          : 3;
  const list = Array.from(groups.values()).sort((a, b) => rank(a) - rank(b));
  const points = list.flatMap((g) => g.points).filter((p) => isPoint(p.row));
  // Every point one after another, as written.
  const sheet = shown
    .map((row) => views.get(row.id))
    .filter((v): v is PointView => !!v);
  return { groups: list, points, sheet };
}
