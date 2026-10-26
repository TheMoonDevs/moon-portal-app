'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import type { WorklogLink } from '@/models/worklogs';
import { PortalSdk } from '@/utils/services/PortalSdk';

/** Waits for typing to settle before asking the server to link new lines. */
const LINK_DELAY_MS = 4000;
const NOT_PROJECT = '__none';

const ProjectDot = ({
  project,
}: {
  project?: LinkCandidates['projects'][number];
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

/** A project (and task) picker for one line. */
const LinePicker = ({
  link,
  candidates,
  onPick,
}: {
  link: WorklogLink;
  candidates: LinkCandidates;
  onPick: (projectId: string | null, taskId: string | null) => void;
}) => {
  const companies = useMemo(() => {
    const map = new Map<string, LinkCandidates['projects']>();
    for (const p of candidates.projects)
      map.set(p.companyName, [...(map.get(p.companyName) ?? []), p]);
    return Array.from(map.entries());
  }, [candidates.projects]);
  const tasks = candidates.tasks.filter((t) => t.projectId === link.projectId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label="Project"
        value={link.projectId ?? (link.source === 'user' ? NOT_PROJECT : '')}
        onChange={(e) =>
          onPick(
            e.target.value === NOT_PROJECT ? null : e.target.value || null,
            null,
          )
        }
        className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700"
      >
        {!link.projectId && link.source !== 'user' && (
          <option value="">Pick a project…</option>
        )}
        {companies.map(([company, projects]) => (
          <optgroup key={company} label={company}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={NOT_PROJECT}>Not project work</option>
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
  });
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const relink = useCallback(async () => {
    try {
      const res = await PortalSdk.postData('/api/user/worklogs/links', {
        worklogId,
      });
      setLinks(res?.data?.links ?? []);
      setCandidates({
        projects: res?.data?.projects ?? [],
        tasks: res?.data?.tasks ?? [],
      });
    } catch {
      // Linking is a helper; the worklog itself is already saved.
    }
  }, [worklogId]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(relink, LINK_DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [relink, version]);

  const pick = async (
    link: WorklogLink,
    projectId: string | null,
    taskId: string | null,
  ) => {
    const before = links;
    const project = candidates.projects.find((p) => p.id === projectId);
    setLinks((all) =>
      all.map((l) =>
        l.key === link.key
          ? {
              ...l,
              projectId,
              companyId: project?.companyId ?? null,
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
      });
    } catch {
      setLinks(before);
      toast.error('Could not save that. Try again.');
    }
  };

  // No projects to link to: nothing to show.
  if (!candidates.projects.length) return null;

  const unplaced = links.filter((l) => l.source === 'none');
  const byProject = candidates.projects
    .map((project) => ({
      project,
      lines: links.filter((l) => l.projectId === project.id),
    }))
    .filter((g) => g.lines.length);
  if (!byProject.length && !unplaced.length) return null;

  const openGroup = byProject.find((g) => g.project.id === open);

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
      </div>

      {openGroup && (
        <ul className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-2">
          {openGroup.lines.map((link) => (
            <li
              key={link.key}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-neutral-600">
                {link.text}
              </span>
              <LinePicker
                link={link}
                candidates={candidates}
                onPick={(p, t) => pick(link, p, t)}
              />
            </li>
          ))}
        </ul>
      )}

      {unplaced.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-medium text-amber-800">
            Which project {unplaced.length === 1 ? 'is this' : 'are these'} for?
          </p>
          {unplaced.map((link) => (
            <div
              key={link.key}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-neutral-700">
                {link.text}
              </span>
              <LinePicker
                link={link}
                candidates={candidates}
                onPick={(p, t) => pick(link, p, t)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
