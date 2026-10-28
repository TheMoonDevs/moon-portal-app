'use client';

import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { LinkCandidates } from '@/lib/worklogs/linker';
import type { PointEvent, PointStatus } from '@/lib/worklogs/timeline';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { carryOpenPoints, worklogSaves } from '../WorklogsHelper';
import type { Row } from './rows';
import { isPoint, newRowId, rowKey, toRows, toWorks } from './rows';

/*
 * One day of a person's worklog on the worklog page: its rows, where each
 * row is linked (project, task), its history, and saving. Edits save on
 * their own shortly after typing stops; then the server links new rows,
 * makes their tasks and records what changed.
 */

const SAVE_AFTER_MS = 900;

export type LinkedTask = {
  id: string;
  title: string;
  status: string;
  size?: string;
  projectId: string;
  forDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
};

export type DayLink = WorklogLink;

const errorText = (err: unknown, fallback: string) =>
  (err as any)?.response?.data?.error || (err as any)?.error || fallback;

const dayTitle = (date: string) =>
  `${dayjs(date).format('MMMM DD')}  - ${dayjs(date).format('dddd')}`;

export function useDayLog(date: string) {
  const { user } = useUser();
  const [log, setLog] = useState<WorkLogs | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [links, setLinks] = useState<DayLink[]>([]);
  const [timeline, setTimeline] = useState<PointEvent[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [candidates, setCandidates] = useState<LinkCandidates>({
    projects: [],
    tasks: [],
    companies: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  /** Bumped after each sync, so panels that read tasks can reload. */
  const [version, setVersion] = useState(0);

  // The latest copies, for saves that run after a render.
  const state = useRef({ log, rows, candidates });
  state.current = { log, rows, candidates };
  /** Keys of rows taken out since the last sync. */
  const removed = useRef<string[]>([]);
  const loadSeq = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleOf = useCallback(
    (id: string) =>
      state.current.candidates.projects.find((p) => p.id === id)?.name ??
      'Project',
    [],
  );

  /** Asks the server to link the day's lines; returns the fresh links. */
  const sync = useCallback(async (worklogId: string, current: Row[]) => {
    const renames = current
      .filter((r) => !r.claude && r.syncedKey && r.syncedKey !== rowKey(r))
      .map((r) => ({ from: r.syncedKey!, to: rowKey(r) }));
    const gone = removed.current;
    removed.current = [];
    const res = await PortalSdk.postData('/api/user/worklogs/links', {
      worklogId,
      renames,
      removed: gone,
    });
    const data = res?.data ?? {};
    const synced: Record<string, string> = {};
    for (const r of current) synced[r.id] = rowKey(r);
    // The server now knows each row by the words it had when sent.
    setRows((all) =>
      all.map((r) => (synced[r.id] ? { ...r, syncedKey: synced[r.id] } : r)),
    );
    setLinks(data.links ?? []);
    setTimeline(data.timeline ?? []);
    setLinkedTasks(data.linkedTasks ?? []);
    setCandidates({
      projects: data.projects ?? [],
      tasks: data.tasks ?? [],
      companies: data.companies ?? [],
    });
    setVersion((v) => v + 1);
    // New rows written under a company (not one of its projects).
    const places = current.filter((r) => r.place && isPoint(r));
    for (const r of places) {
      await PortalSdk.patchData('/api/user/worklogs/links', {
        worklogId,
        key: rowKey(r),
        companyId: r.place!.companyId,
      }).catch(() => undefined);
    }
    if (places.length) {
      setRows((all) =>
        all.map((r) =>
          places.some((p) => p.id === r.id) ? { ...r, place: null } : r,
        ),
      );
      const again = await PortalSdk.postData('/api/user/worklogs/links', {
        worklogId,
      });
      setLinks(again?.data?.links ?? []);
    }
    return (data.links ?? []) as DayLink[];
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      await worklogSaves.queue.catch(() => undefined);
      await carryOpenPoints();
      const res = await PortalSdk.getData(
        `/api/user/worklogs?date=${date}&userId=${user.id}&logType=dayLog`,
        null,
      );
      if (seq !== loadSeq.current) return;
      const found: WorkLogs | null = res?.data?.workLogs?.[0] ?? null;
      setLog(found);
      setRows(toRows(found?.works));
      setLinks((found?.links ?? []) as DayLink[]);
      setTimeline((found?.timeline ?? []) as PointEvent[]);
      setDirty(false);
      removed.current = [];
      if (found?.id) await sync(found.id, toRows(found.works));
      else {
        // An empty day still needs the projects to pick from.
        const res = await PortalSdk.getData(
          '/api/user/worklogs/links',
          null,
        ).catch(() => null);
        if (seq !== loadSeq.current) return;
        if (res?.data)
          setCandidates({
            projects: res.data.projects ?? [],
            tasks: res.data.tasks ?? [],
            companies: res.data.companies ?? [],
          });
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not open this day.'));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [date, user?.id, sync]);

  useEffect(() => {
    setLog(null);
    setRows([]);
    setLinks([]);
    setTimeline([]);
    setLinkedTasks([]);
    load();
  }, [load]);

  /** Saves the rows as they are now, then links them. */
  const save = useCallback(async () => {
    if (!user?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const { log: base, rows: current } = state.current;
    const works = toWorks(base?.works, current, titleOf);
    setSaving(true);
    const run = worklogSaves.queue
      .catch(() => undefined)
      .then(() =>
        PortalSdk.putData('/api/user/worklogs', {
          ...(base?.id && { id: base.id }),
          userId: user.id,
          logType: 'dayLog',
          date,
          title: base?.title ?? dayTitle(date),
          works,
          createdAt: base?.createdAt ?? new Date(),
          updatedAt: new Date(),
        }),
      )
      .then(async (res) => {
        const saved: WorkLogs | undefined = res?.data?.workLogs;
        if (!saved) return;
        setLog(saved);
        // Saved as typed; anything typed during the save saves next.
        if (state.current.rows === current) setDirty(false);
        if (saved.id) await sync(saved.id, current);
      })
      .catch((err) => toast.error(errorText(err, 'Could not save.')))
      .finally(() => setSaving(false));
    worklogSaves.queue = run;
    return run;
  }, [date, user?.id, sync, titleOf]);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save();
    }, SAVE_AFTER_MS);
  }, [save]);

  // Leaving the day (or the page) saves what is still waiting.
  const pending = useRef({ dirty, save });
  pending.current = { dirty, save };
  useEffect(
    () => () => {
      if (pending.current.dirty) pending.current.save();
    },
    [date],
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Saves now when anything is waiting, so a link can be changed. */
  const flush = useCallback(async () => {
    if (state.current.rows.some((r) => r.raw === null) || pending.current.dirty)
      await save();
    else await worklogSaves.queue.catch(() => undefined);
    return state.current.log?.id ?? null;
  }, [save]);

  /* ------------------------------ Row edits ------------------------------ */

  const updateRows = useCallback(
    (change: (rows: Row[]) => Row[]) => {
      setRows((all) => {
        const next = change(all);
        state.current.rows = next;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const editRow = useCallback(
    (id: string, fields: Partial<Row>) =>
      updateRows((all) =>
        all.map((r) => (r.id === id ? { ...r, ...fields, raw: null } : r)),
      ),
    [updateRows],
  );

  /** A new row after `afterId` (or at the end of its section). */
  const addRow = useCallback(
    (
      section: string,
      afterId: string | null,
      fields: Partial<Row> = {},
    ): string => {
      const row: Row = {
        id: newRowId(),
        section,
        text: '',
        status: null,
        isPrivate: false,
        claude: false,
        raw: null,
        syncedKey: null,
        indent: '',
        ...fields,
      };
      updateRows((all) => {
        const at = afterId ? all.findIndex((r) => r.id === afterId) : -1;
        if (at >= 0)
          return [...all.slice(0, at + 1), row, ...all.slice(at + 1)];
        let last = -1;
        all.forEach((r, i) => {
          if (r.section === section) last = i;
        });
        return last >= 0
          ? [...all.slice(0, last + 1), row, ...all.slice(last + 1)]
          : [...all, row];
      });
      return row.id;
    },
    [updateRows],
  );

  const removeRow = useCallback(
    (id: string) =>
      updateRows((all) => {
        const row = all.find((r) => r.id === id);
        if (row?.syncedKey) removed.current.push(row.syncedKey);
        return all.filter((r) => r.id !== id);
      }),
    [updateRows],
  );

  /* ----------------------------- Link changes ---------------------------- */

  const patchLink = useCallback(
    async (row: Row, body: Record<string, unknown>) => {
      const worklogId = await flush();
      if (!worklogId) return;
      const key = state.current.rows.find((r) => r.id === row.id);
      if (!key) return;
      try {
        const res = await PortalSdk.patchData('/api/user/worklogs/links', {
          worklogId,
          key: rowKey(key),
          ...body,
        });
        setLinks(res?.data?.links ?? []);
        await sync(worklogId, state.current.rows);
      } catch (err) {
        toast.error(errorText(err, 'Could not move that point.'));
      }
    },
    [flush, sync],
  );

  /** One of the assistant's lines: its status goes through the server. */
  const setClaudeStatus = useCallback(
    async (row: Row, status: PointStatus) => {
      const worklogId = await flush();
      if (!worklogId) return;
      try {
        await PortalSdk.patchData('/api/user/worklogs/points', {
          worklogId,
          key: rowKey(row),
          status,
        });
        await load();
      } catch (err) {
        toast.error(errorText(err, 'Could not change that point.'));
      }
    },
    [flush, load],
  );

  /** Puts tasks on this day as points. */
  const addTasks = useCallback(
    async (taskIds: string[]) => {
      await flush();
      try {
        const res = await PortalSdk.postData('/api/user/worklogs/day-tasks', {
          date,
          taskIds,
        });
        await load();
        return res?.data?.added ?? 0;
      } catch (err) {
        toast.error(errorText(err, 'Could not add that task.'));
        return 0;
      }
    },
    [date, flush, load],
  );

  const linkByKey = useMemo(
    () => new Map(links.map((l) => [l.key, l])),
    [links],
  );

  return {
    log,
    rows,
    links,
    linkByKey,
    timeline,
    linkedTasks,
    candidates,
    loading,
    saving,
    dirty,
    version,
    editRow,
    addRow,
    removeRow,
    patchLink,
    setClaudeStatus,
    addTasks,
    save,
    reload: load,
  };
}

export type DayLog = ReturnType<typeof useDayLog>;
