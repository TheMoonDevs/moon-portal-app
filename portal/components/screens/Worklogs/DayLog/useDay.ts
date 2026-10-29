'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { PointStatus } from '@/lib/worklogs/timeline';
import { PortalSdk } from '@/utils/services/PortalSdk';

/*
 * A day of the person's tasks, as the worklog page edits it. A new row is a
 * draft until it has words; then it is saved as a task, and later words are
 * saved a moment after typing stops. Moves, notes and places are sent at
 * once, and the day is read again after them.
 */

export type DayTask = {
  id: string;
  title: string;
  status: string;
  flag?: 'blocked' | 'waiting' | null;
  projectId?: string | null;
  companyId?: string | null;
  placedBy?: 'auto' | 'user' | 'personal' | null;
  forDate?: string | null;
  order?: number | null;
  madeBy?: string | null;
  size?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  /** Only on the page: not saved yet. */
  draft?: boolean;
  /** Only on the page: the row's key while it is open, kept once saved. */
  rowKey?: string;
};

export type DayPoint = {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  text: string;
  status?: PointStatus | null;
  by: string;
  at: string;
};

export type DayProject = {
  id: string;
  name: string;
  color?: string | null;
  companyId: string;
  companyName?: string;
};

export type DayCompany = {
  id: string;
  name: string;
  color?: string | null;
  /** Its CORE project, which takes company work on no other project. */
  coreProjectId?: string | null;
};

export type TaskMove = PointStatus | 'todo' | 'archived';

export type PlaceInput =
  | { projectId: string }
  | { companyId: string }
  | { personal: true }
  | { none: true };

let seq = 0;
const draftId = () => `draft-${Date.now().toString(36)}${(seq++).toString(36)}`;

const errorOf = (e: any, fallback: string) =>
  (typeof e?.error === 'string' && e.error) || fallback;

export function useDay(date: string) {
  const [tasks, setTasks] = useState<DayTask[]>([]);
  const [points, setPoints] = useState<DayPoint[]>([]);
  const [projects, setProjects] = useState<DayProject[]>([]);
  const [companies, setCompanies] = useState<DayCompany[]>([]);
  const [today, setToday] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(0);
  // Bumped after every saved change, for the panels that read tasks too.
  const [version, setVersion] = useState(0);
  const dateRef = useRef(date);
  dateRef.current = date;
  // The rows as they are now, for saves that run after a pause.
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // A draft being saved, so words typed meanwhile go to the task it becomes.
  const creating = useRef(new Map<string, Promise<DayTask | null>>());
  const realId = useRef(new Map<string, string>());

  const load = useCallback(async (quiet = false) => {
    const asked = dateRef.current;
    if (!quiet) setLoading(true);
    try {
      const res = await PortalSdk.getData(`/api/me/day?date=${asked}`, null);
      if (asked !== dateRef.current) return;
      const data = res?.data ?? {};
      setTasks((current) => [
        // Words still being typed stay as typed.
        ...((data.tasks ?? []) as DayTask[]).map((t) => {
          const same = current.find((c) => c.id === t.id);
          const typing = same && timers.current.has(same.id);
          return {
            ...t,
            ...(same?.rowKey && { rowKey: same.rowKey }),
            ...(typing && { title: same.title }),
          };
        }),
        // Drafts still being written stay.
        ...current.filter((t) => t.draft && !realId.current.has(t.id)),
      ]);
      setPoints(data.points ?? []);
      setProjects(data.projects ?? []);
      setCompanies(data.companies ?? []);
      setToday(data.today ?? null);
    } catch {
      if (!quiet) toast.error('Could not load this day.');
    } finally {
      if (asked === dateRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTasks([]);
    setPoints([]);
    realId.current.clear();
    load();
  }, [date, load]);

  const track = useCallback(async <T>(work: () => Promise<T>) => {
    setSaving((n) => n + 1);
    try {
      return await work();
    } finally {
      setSaving((n) => n - 1);
      setVersion((v) => v + 1);
    }
  }, []);

  const replace = (id: string, task: DayTask) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...task } : t)));

  /** The saved id of a row, waiting for its draft to be saved first. */
  const idOf = useCallback(async (id: string) => {
    if (realId.current.has(id)) return realId.current.get(id)!;
    const pending = creating.current.get(id);
    if (pending) return (await pending)?.id ?? null;
    return id.startsWith('draft-') ? null : id;
  }, []);

  /** A new empty row after another (or at the end); returns its id. */
  const addDraft = useCallback(
    (afterId?: string | null, place?: PlaceInput | null) => {
      const id = draftId();
      const after = afterId ? tasks.find((t) => t.id === afterId) : undefined;
      const draft: DayTask = {
        id,
        title: '',
        status: 'TODO',
        draft: true,
        forDate: dateRef.current,
        ...(place && 'projectId' in place && { projectId: place.projectId }),
        ...(place && 'companyId' in place && { companyId: place.companyId }),
      };
      (draft as any).afterId = afterId ?? null;
      (draft as any).place = place ?? null;
      setTasks((ts) => {
        const index = after ? ts.findIndex((t) => t.id === after.id) : -1;
        if (index < 0) return [...ts, draft];
        return [...ts.slice(0, index + 1), draft, ...ts.slice(index + 1)];
      });
      return id;
    },
    [tasks],
  );

  const create = useCallback(
    (draft: DayTask, title: string) => {
      const promise = track(async () => {
        try {
          const afterId = (draft as any).afterId
            ? await idOf((draft as any).afterId)
            : null;
          const res = await PortalSdk.postData('/api/me/day/tasks', {
            date: dateRef.current,
            title,
            afterId,
            place: (draft as any).place ?? undefined,
          });
          const task: DayTask = res?.data?.task;
          if (!task) return null;
          realId.current.set(draft.id, task.id);
          // Keep the words typed since, which go out next.
          setTasks((ts) =>
            ts.map((t) =>
              t.id === draft.id
                ? { ...task, title: t.title, rowKey: draft.id }
                : t,
            ),
          );
          return task;
        } catch (e) {
          toast.error(errorOf(e, 'Could not save the task.'));
          return null;
        } finally {
          creating.current.delete(draft.id);
        }
      });
      creating.current.set(draft.id, promise);
      return promise;
    },
    [idOf, track],
  );

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const real = await idOf(id);
      if (!real) return null;
      return track(async () => {
        try {
          const res = await PortalSdk.patchData(
            `/api/me/day/tasks/${real}`,
            body,
          );
          const task: DayTask | undefined = res?.data?.task;
          if (task)
            setTasks((ts) =>
              ts.map((t) =>
                t.id === id || t.id === real
                  ? // Words typed while saving stay as typed.
                    {
                      ...task,
                      rowKey: t.rowKey,
                      title: 'title' in body ? t.title : task.title,
                    }
                  : t,
              ),
            );
          return task ?? null;
        } catch (e) {
          toast.error(errorOf(e, 'Could not save the change.'));
          return null;
        }
      });
    },
    [idOf, track],
  );

  /** New words for a row, saved once typing stops. */
  const editTitle = useCallback(
    (id: string, title: string) => {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          const words = title.trim();
          if (!words) return;
          const row = tasksRef.current.find((t) => t.id === id);
          if (
            row?.draft &&
            !realId.current.has(id) &&
            !creating.current.has(id)
          )
            create(row, words);
          else patch(id, { title: words });
        }, 600),
      );
    },
    [create, patch],
  );

  /** Saves a row's words now, e.g. when the cursor leaves it. */
  const flush = useCallback(
    (id: string) => {
      const timer = timers.current.get(id);
      if (!timer) return;
      clearTimeout(timer);
      timers.current.delete(id);
      const row = tasksRef.current.find((t) => t.id === id);
      const words = row?.title.trim();
      if (!row || !words) return;
      if (row.draft && !realId.current.has(id) && !creating.current.has(id))
        create(row, words);
      else patch(id, { title: words });
    },
    [create, patch],
  );

  /** Moves a task (and logs it), with an optional note. */
  const move = useCallback(
    async (id: string, to: TaskMove, note = '') => {
      const row = tasks.find((t) => t.id === id);
      let real = await idOf(id);
      if (!real && row?.draft) {
        if (!row.title.trim()) return;
        real = (await create(row, row.title.trim()))?.id ?? null;
      }
      if (!real) return;
      // Shown at once; the saved task replaces it.
      const status =
        to === 'done'
          ? 'DONE'
          : to === 'archived'
            ? 'ARCHIVED'
            : to === 'todo'
              ? 'TODO'
              : to === 'not_done'
                ? (row?.status ?? 'TODO')
                : 'IN_PROGRESS';
      setTasks((ts) =>
        ts.map((t) =>
          t.id === id || t.id === real
            ? {
                ...t,
                status,
                flag: to === 'blocked' || to === 'waiting' ? to : null,
              }
            : t,
        ),
      );
      await track(async () => {
        try {
          const res = await PortalSdk.postData('/api/me/day/points', {
            taskId: real,
            status: to,
            text: note,
            date: dateRef.current,
          });
          if (res?.data?.task)
            setTasks((ts) =>
              ts.map((t) =>
                t.id === id || t.id === real
                  ? { ...res.data.task, title: t.title, rowKey: t.rowKey }
                  : t,
              ),
            );
        } catch (e) {
          toast.error(errorOf(e, 'Could not change it.'));
        }
      });
      load(true);
    },
    [tasks, idOf, create, track, load],
  );

  const addNote = useCallback(
    async (id: string, text: string) => {
      const real = await idOf(id);
      if (!real || !text.trim()) return;
      await track(async () => {
        try {
          await PortalSdk.postData('/api/me/day/points', {
            taskId: real,
            text,
            date: dateRef.current,
          });
        } catch (e) {
          toast.error(errorOf(e, 'Could not add the note.'));
        }
      });
      load(true);
    },
    [idOf, track, load],
  );

  const place = useCallback(
    async (id: string, to: PlaceInput) => {
      await patch(id, { place: to });
      load(true);
    },
    [patch, load],
  );

  const planFor = useCallback(
    async (id: string, forDate: string) => {
      await patch(id, { forDate });
      load(true);
    },
    [patch, load],
  );

  const movePoint = useCallback(
    async (pointId: string, taskId: string) => {
      const real = await idOf(taskId);
      if (!real) return;
      setPoints((ps) =>
        ps.map((p) => (p.id === pointId ? { ...p, taskId: real } : p)),
      );
      await track(async () => {
        try {
          await PortalSdk.patchData(`/api/me/day/points/${pointId}`, {
            taskId: real,
          });
        } catch (e) {
          toast.error(errorOf(e, 'Could not move it.'));
        }
      });
      load(true);
    },
    [idOf, track, load],
  );

  /** Takes a row out: a draft or an untouched task goes, others are archived. */
  const remove = useCallback(
    async (id: string) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      const real = await idOf(id);
      setTasks((ts) => ts.filter((t) => t.id !== id && t.id !== real));
      if (!real) return;
      await track(async () => {
        try {
          await PortalSdk.deleteData(`/api/me/day/tasks/${real}`, {});
        } catch {
          // Worked on already: archived, so its history stays.
          await PortalSdk.postData('/api/me/day/points', {
            taskId: real,
            status: 'archived',
            text: '',
            date: dateRef.current,
          }).catch(() => toast.error('Could not take it out.'));
        }
      });
      load(true);
    },
    [idOf, track, load],
  );

  return {
    date,
    today,
    tasks,
    points,
    projects,
    companies,
    loading,
    saving: saving > 0,
    version,
    reload: () => load(true),
    addDraft,
    editTitle,
    flush,
    move,
    addNote,
    place,
    planFor,
    movePoint,
    remove,
  };
}

export type Day = ReturnType<typeof useDay>;
