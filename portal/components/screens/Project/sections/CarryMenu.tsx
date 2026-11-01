'use client';

import type { Task } from '@db/client';
import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import { errorText } from '../../Admin/Workspace/shared';
import { DatePanel, quickDays } from '../../Worklogs/DayLog/DatePopover';

/*
 * For a goal task whose day went by unfinished: move it to another day, or
 * merge it into a later task of the goal (its words and notes go there).
 * Either way the goal missed that day, and the worklogs show a red star on
 * it.
 */

const item =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-white/[0.06] disabled:opacity-40';

export const CarryMenu = ({
  task,
  later,
  onDone,
}: {
  task: Task;
  /** Later open tasks of the same goal, soonest first. */
  later: Task[];
  onDone: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const carry = async (body: Record<string, string>, said: string) => {
    setBusy(true);
    try {
      await PortalSdk.postData(`/api/tasks/${task.id}/carry`, body);
      toast.success(said, {
        description: `Marked missed for ${dayjs(task.forDate).format('ddd D MMM')}.`,
      });
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const day = (d: string) =>
    dayjs(d).format(
      dayjs(d).isSame(dayjs(), 'year') ? 'ddd D MMM' : 'D MMM YYYY',
    );

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPicking(false);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Its day went by: move it to another day, or merge it into a later one"
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full border border-rose-400/30 px-2 py-0.5 text-[11px] text-rose-200 transition-colors hover:bg-rose-400/10',
            open && 'bg-rose-400/10',
          )}
        >
          {busy ? (
            <Spin className="size-3" />
          ) : (
            <Icon name="event_repeat" className="text-[13px]" />
          )}
          Move on
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[1300] w-64 rounded-xl border border-white/10 bg-neutral-900 p-1.5 text-neutral-200 shadow-2xl shadow-black/50"
        >
          {picking ? (
            <DatePanel
              value={null}
              clearable={false}
              onPick={(date) =>
                date &&
                carry({ mode: 'move', day: date }, `Moved to ${day(date)}`)
              }
            />
          ) : (
            <>
              <p className="px-2.5 pb-1 pt-1 text-[11px] leading-snug text-neutral-500">
                The goal missed {day(task.forDate!)}. Do it on another day:
              </p>
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Move to
              </p>
              {[
                { label: 'Today', date: dayjs().format('YYYY-MM-DD') },
                ...quickDays(),
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    carry(
                      { mode: 'move', day: o.date },
                      `Moved to ${day(o.date)}`,
                    )
                  }
                  className={item}
                >
                  <span className="flex-1">{o.label}</span>
                  <span className="text-xs tabular-nums text-neutral-500">
                    {dayjs(o.date).format('ddd D MMM')}
                  </span>
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => setPicking(true)}
                className={item}
              >
                <Icon
                  name="calendar_month"
                  className="text-[16px] text-neutral-400"
                />
                <span className="flex-1">Pick a day…</span>
              </button>
              <div className="my-1 border-t border-white/[0.07]" />
              <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Merge into
              </p>
              {later.length ? (
                later.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    title="Its title and notes go into this task"
                    onClick={() =>
                      carry(
                        { mode: 'merge', intoId: t.id },
                        `Merged into ${day(t.forDate!)}`,
                      )
                    }
                    className={item}
                  >
                    <Icon
                      name="merge"
                      className="text-[16px] text-neutral-400"
                    />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                      {day(t.forDate!)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-2.5 py-1.5 text-xs text-neutral-600">
                  No later task of this goal yet
                </p>
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
