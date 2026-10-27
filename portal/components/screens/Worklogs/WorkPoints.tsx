'use client';

import { Dialog, DialogContent } from '@mui/material';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { OptimiseGroup } from '@/lib/worklogs/optimise';
import type { PointEvent, PointStatus } from '@/lib/worklogs/timeline';
import {
  eventsFor,
  POINT_STATUSES,
  sectionLines,
} from '@/lib/worklogs/timeline';
import { PortalSdk } from '@/utils/services/PortalSdk';

const STATUS_KEYS = Object.keys(POINT_STATUSES) as PointStatus[];

/** Fewer assistant points than this and Optimise is not offered. */
const OPTIMISE_FROM = 3;

const errorText = (err: unknown, fallback: string) =>
  (err as any)?.response?.data?.error || (err as any)?.error || fallback;

/** One status, as a pill to click. */
const StatusPill = ({
  status,
  active,
  onClick,
  disabled,
}: {
  status: PointStatus;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors disabled:opacity-50',
      active
        ? 'border-neutral-800 bg-neutral-900 text-white'
        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400',
    )}
  >
    <span>{POINT_STATUSES[status].emoji}</span>
    {POINT_STATUSES[status].label}
  </button>
);

/** Groups a day's assistant points into a few, after a preview. */
const OptimiseDialog = ({
  open,
  worklogId,
  onClose,
  onApplied,
  beforeChange,
}: {
  open: boolean;
  worklogId: string;
  onClose: () => void;
  onApplied: () => void;
  beforeChange: () => Promise<unknown>;
}) => {
  const [plan, setPlan] = useState<{
    before: number;
    groups: OptimiseGroup[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = async () => {
    setLoading(true);
    setPlan(null);
    try {
      await beforeChange();
      const res = await PortalSdk.postData('/api/user/worklogs/optimise', {
        worklogId,
      });
      setPlan(res?.data ?? null);
    } catch (err) {
      toast.error(errorText(err, 'Could not plan that. Try again.'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!plan) return;
    setApplying(true);
    try {
      await PortalSdk.putData('/api/user/worklogs/optimise', {
        worklogId,
        groups: plan.groups.map(({ text, status, merge }) => ({
          text,
          status,
          merge,
        })),
      });
      toast.success(
        `${plan.before} points are now ${plan.groups.length}. Merged lines are kept as notes.`,
      );
      onApplied();
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not optimise this day.'));
    } finally {
      setApplying(false);
    }
  };

  const edit = (index: number, change: Partial<OptimiseGroup>) =>
    setPlan(
      (p) =>
        p && {
          ...p,
          groups: p.groups.map((g, i) =>
            i === index ? { ...g, ...change } : g,
          ),
        },
    );

  const merged = plan?.groups.filter((g) => g.merge.length > 1).length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={applying ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: load }}
    >
      <DialogContent className="flex flex-col gap-4 !p-5">
        <div>
          <p className="text-lg font-semibold text-neutral-900">
            Optimise work points
          </p>
          <p className="text-xs text-neutral-500">
            Claude’s points for the day, grouped into one per deliverable. Each
            merged line is kept as a note on its new point. Your own lines are
            left as they are.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-neutral-500">
            <span className="size-4 animate-spin rounded-full border-y-2 border-neutral-700" />
            Grouping points…
          </div>
        )}

        {plan && !plan.groups.length && (
          <p className="py-6 text-sm text-neutral-500">
            Nothing to group: this day has only {plan.before} Claude{' '}
            {plan.before === 1 ? 'point' : 'points'}.
          </p>
        )}

        {plan && plan.groups.length > 0 && (
          <>
            <p className="text-sm text-neutral-700">
              <b>{plan.before}</b> points become <b>{plan.groups.length}</b>
              {merged > 0 && (
                <span className="text-neutral-500">
                  {' '}
                  · {merged} {merged === 1 ? 'group' : 'groups'} merged
                </span>
              )}
            </p>
            <ol className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
              {plan.groups.map((g, i) => (
                <li
                  key={g.merge.join('-')}
                  className="rounded-lg border border-neutral-200 p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <select
                      aria-label="Status"
                      value={g.status}
                      onChange={(e) =>
                        edit(i, { status: e.target.value as PointStatus })
                      }
                      className="h-7 shrink-0 rounded-md border border-neutral-200 bg-white px-1 text-xs"
                    >
                      {STATUS_KEYS.map((s) => (
                        <option key={s} value={s}>
                          {POINT_STATUSES[s].emoji} {POINT_STATUSES[s].label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      aria-label="Point"
                      value={g.text}
                      rows={g.text.length > 70 ? 2 : 1}
                      onChange={(e) =>
                        edit(i, { text: e.target.value.replace(/\n/g, ' ') })
                      }
                      className="min-w-0 flex-1 resize-none rounded-md border border-transparent px-1 py-0.5 text-sm text-neutral-800 outline-none hover:border-neutral-200 focus:border-neutral-400"
                    />
                  </div>
                  <p className="mt-1 pl-1 text-[11px] text-neutral-400">
                    {g.project ?? 'No project'}
                    {g.merge.length > 1 && ` · merges ${g.merge.length} lines`}
                  </p>
                  {g.merge.length > 1 && (
                    <ul className="ml-1 mt-1 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
                      {g.lines.map((l) => (
                        <li
                          key={l.key}
                          className="truncate text-[11px] text-neutral-500"
                        >
                          {l.status ? `${POINT_STATUSES[l.status].emoji} ` : ''}
                          {l.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={
              !plan ||
              !merged ||
              applying ||
              plan.groups.some((g) => !g.text.trim())
            }
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * The day's work points with their status: one click on a point shows the
 * statuses and another sets it. Points still open on an earlier day move
 * here with a "since" date. Optimise groups the assistant's many points.
 */
export const WorkPoints = ({
  worklogId,
  date,
  works,
  timeline,
  beforeChange,
  onChanged,
}: {
  worklogId: string;
  date?: string | null;
  works: unknown;
  timeline?: PointEvent[];
  /** Saves anything typed, so the change lands on the latest copy. */
  beforeChange: () => Promise<unknown>;
  onChanged: () => void;
}) => {
  const lines = useMemo(() => sectionLines(works), [works]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [optimising, setOptimising] = useState(false);
  const claudeCount = lines.filter((l) => l.claude).length;

  if (!lines.length) return null;

  const setStatus = async (key: string, status: PointStatus) => {
    setBusy(key);
    try {
      await beforeChange();
      await PortalSdk.patchData('/api/user/worklogs/points', {
        worklogId,
        key,
        status,
      });
      setOpen(null);
      onChanged();
    } catch (err) {
      toast.error(errorText(err, 'Could not change that. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const sinceOf = (key: string) => {
    const start = eventsFor(timeline, key)[0]?.at;
    if (!start || !date) return null;
    return dayjs(start).format('YYYY-MM-DD') < date
      ? dayjs(start).format('D MMM')
      : null;
  };

  return (
    <div className="mx-4 mt-2 flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-widest text-neutral-400">
          Work points · {lines.length}
        </span>
        {claudeCount >= OPTIMISE_FROM && (
          <button
            type="button"
            onClick={() => setOptimising(true)}
            title="Group Claude’s points into one per deliverable"
            className="flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 hover:border-neutral-400"
          >
            <span className="material-symbols-outlined !text-sm">
              auto_awesome
            </span>
            Optimise
          </button>
        )}
      </div>
      <ul className="flex flex-col">
        {lines.map((line) => {
          const since = sinceOf(line.key);
          const isOpen = open === line.key;
          return (
            <li key={line.key} className="flex flex-col gap-1 py-1">
              <div className="flex items-start gap-2 text-xs">
                <button
                  type="button"
                  aria-label="Change status"
                  title={
                    line.status
                      ? `${POINT_STATUSES[line.status].label} · click to change`
                      : 'Set a status'
                  }
                  onClick={() => setOpen(isOpen ? null : line.key)}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border text-[13px] transition-colors',
                    isOpen
                      ? 'border-neutral-500 bg-neutral-100'
                      : 'border-neutral-200 hover:border-neutral-400',
                  )}
                >
                  {busy === line.key ? (
                    <span className="size-3 animate-spin rounded-full border-y-2 border-neutral-700" />
                  ) : line.status ? (
                    POINT_STATUSES[line.status].emoji
                  ) : (
                    <span className="size-2 rounded-full border border-neutral-400" />
                  )}
                </button>
                <span className="min-w-0 flex-1 pt-1 leading-4 text-neutral-700">
                  {line.claude && (
                    <span className="material-symbols-outlined mr-1 align-middle !text-xs text-neutral-400">
                      smart_toy
                    </span>
                  )}
                  {line.text}
                  {since && (
                    <span className="ml-1.5 whitespace-nowrap rounded bg-amber-50 px-1.5 py-px text-[10px] text-amber-700">
                      since {since}
                    </span>
                  )}
                </span>
              </div>
              {isOpen && (
                <div className="ml-8 flex flex-wrap gap-1">
                  {STATUS_KEYS.map((s) => (
                    <StatusPill
                      key={s}
                      status={s}
                      active={line.status === s}
                      disabled={!!busy}
                      onClick={() =>
                        line.status === s
                          ? setOpen(null)
                          : setStatus(line.key, s)
                      }
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <OptimiseDialog
        open={optimising}
        worklogId={worklogId}
        onClose={() => setOptimising(false)}
        onApplied={onChanged}
        beforeChange={beforeChange}
      />
    </div>
  );
};
