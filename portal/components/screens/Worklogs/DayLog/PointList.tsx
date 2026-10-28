'use client';

import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

import { Icon } from '../../Admin/shared/AdminUI';
import { TASK_STATUS_META } from '../../Admin/Workspace/shared';
import { OriginTag } from './OriginBar';
import type { PickerOption } from './Picker';
import { Picker, PickerList } from './Picker';
import type { Row, RowStatus } from './rows';
import { isPoint, rowKey } from './rows';
import type { DayLog } from './useDayLog';
import type { Place, PointView, SubView } from './view';

/*
 * The day's points on one sheet, one after another, written like the steps
 * of a plan: Enter adds the next point, Backspace on an empty one takes it
 * out, the arrows move between points. Each point shows the project it is
 * in, to change with a click. The assistant's notes sit under the point they
 * are part of; one it could not place asks with a "?".
 */

export type MyTask = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  companyId: string;
  dueDate?: string | null;
  forDate?: string | null;
  /** The task this one follows on from. */
  followsId?: string | null;
};

const STATUS_KEYS = Object.keys(POINT_STATUSES) as PointStatus[];

const STATUS_ICON: Record<PointStatus, { icon: string; className: string }> = {
  doing: {
    icon: 'clock_loader_40',
    className: 'text-amber-300 auto-light:text-amber-700',
  },
  done: {
    icon: 'check_circle',
    className: 'text-emerald-400 auto-light:text-emerald-600',
  },
  not_done: {
    icon: 'cancel',
    className: 'text-rose-400 auto-light:text-rose-700',
  },
  blocked: {
    icon: 'block',
    className: 'text-rose-400 auto-light:text-rose-700',
  },
  waiting: {
    icon: 'help',
    className: 'text-violet-300 auto-light:text-violet-700',
  },
};

export const StatusIcon = ({
  status,
  className,
}: {
  status: RowStatus;
  className?: string;
}) => {
  if (status === 'moved')
    return (
      <Icon
        name="arrow_forward"
        className={cn('text-neutral-500', className)}
      />
    );
  if (!status)
    return (
      <Icon
        name="radio_button_unchecked"
        className={cn(
          'text-neutral-600 auto-light:text-neutral-400',
          className,
        )}
      />
    );
  return (
    <Icon
      name={STATUS_ICON[status].icon}
      filled={status === 'done'}
      className={cn(STATUS_ICON[status].className, className)}
    />
  );
};

/** Status keys while typing: the same as the old editor's emoji keys. */
const statusForKey = (e: React.KeyboardEvent): PointStatus | null => {
  if (e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.key === ' ') return 'done';
    if (e.key.toLowerCase() === 'q') return 'not_done';
    if (e.key.toLowerCase() === 'p') return 'doing';
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/)?.[1];
    return (
      (
        {
          '1': 'done',
          '2': 'not_done',
          '3': 'doing',
          '4': 'blocked',
          '8': 'waiting',
        } as Record<string, PointStatus>
      )[digit ?? ''] ?? null
    );
  }
  return null;
};

const time = (iso?: string) => (iso ? dayjs(iso).format('HH:mm') : '');

/* -------------------------------------------------------------------------- */

const LineInput = ({
  value,
  onChange,
  onKeyDown,
  inputRef,
  disabled,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // Fonts and widths settle after the first paint (and on resize).
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        inputRef?.(el);
      }}
      rows={1}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={onKeyDown}
      className={cn(
        'block w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-neutral-600 focus:outline-none disabled:cursor-default auto-light:placeholder:text-neutral-400',
        className,
      )}
    />
  );
};

/** A row's menu: its status, where it goes, and taking it out. */
const RowMenu = ({
  status,
  onStatus,
  moveOptions,
  onMove,
  onRemove,
}: {
  status: RowStatus;
  onStatus: (status: PointStatus | null) => void;
  moveOptions?: PickerOption[];
  onMove?: (option: PickerOption) => void;
  onRemove?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setMoving(false);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Point options"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-neutral-200 focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800 max-md:opacity-100"
        >
          <Icon name="more_horiz" className="text-[18px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className={cn(
            'auto-theme z-[1300] rounded-xl border border-white/10 bg-neutral-900 text-sm text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10',
            moving ? 'w-[min(340px,calc(100vw-24px))]' : 'w-56 p-1',
          )}
        >
          {moving && moveOptions && onMove ? (
            <PickerList
              options={moveOptions}
              placeholder="Move to a project…"
              onPick={(o) => {
                setOpen(false);
                setMoving(false);
                onMove(o);
              }}
            />
          ) : (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Status
              </p>
              <button
                type="button"
                onClick={() => {
                  onStatus(null);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]',
                  !status && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
                )}
              >
                <StatusIcon status={null} className="text-[16px]" />
                To do
              </button>
              {STATUS_KEYS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onStatus(s);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]',
                    status === s &&
                      'bg-white/[0.06] auto-light:bg-black/[0.06]',
                  )}
                >
                  <StatusIcon status={s} className="text-[16px]" />
                  {POINT_STATUSES[s].label}
                </button>
              ))}
              {(moveOptions || onRemove) && (
                <div className="my-1 border-t border-white/[0.07] auto-light:border-black/10" />
              )}
              {moveOptions && onMove && (
                <button
                  type="button"
                  onClick={() => setMoving(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]"
                >
                  <Icon
                    name="drive_file_move"
                    className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
                  />
                  Move to…
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRemove();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-300 hover:bg-rose-500/10 auto-light:text-rose-700"
                >
                  <Icon name="delete" className="text-[16px]" />
                  Take it out
                </button>
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/** One of the assistant's notes under a point. */
const SubLog = ({
  sub,
  onStatus,
  placeOptions,
  onPlace,
}: {
  sub: SubView;
  onStatus: (status: PointStatus) => void;
  placeOptions: PickerOption[];
  onPlace: (option: PickerOption) => void;
}) => {
  const last = sub.events[sub.events.length - 1];
  return (
    <div className="group/sub flex items-start gap-2 py-0.5 pl-1 text-[13px] leading-5">
      <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded bg-orange-400/10 text-orange-300 auto-light:text-orange-700">
        <Icon name="smart_toy" className="text-[11px]" />
      </span>
      <StatusIcon status={sub.row.status} className="mt-[3px] text-[14px]" />
      <span
        className={cn(
          'min-w-0 flex-1 text-neutral-300 auto-light:text-neutral-700',
          sub.row.status === 'done' &&
            'text-neutral-500 auto-light:text-neutral-500',
        )}
      >
        {sub.row.text}
        {last && (
          <span className="ml-2 text-[11px] text-neutral-600 auto-light:text-neutral-400">
            {time(last.at)}
            {last.note ? ` · ${last.note}` : ''}
          </span>
        )}
      </span>
      <Picker
        options={placeOptions}
        onPick={onPlace}
        placeholder="Put it under another point…"
        align="end"
        trigger={
          <button
            type="button"
            title="Put it under another point"
            className="shrink-0 rounded px-1 text-[11px] text-neutral-600 opacity-0 hover:text-neutral-300 focus:opacity-100 group-hover/sub:opacity-100 auto-light:text-neutral-400 auto-light:hover:text-neutral-700"
          >
            <Icon name="swap_vert" className="text-[14px]" />
          </button>
        }
      />
      {sub.row.status !== 'done' && sub.row.status !== 'moved' && (
        <button
          type="button"
          title="Mark done"
          onClick={() => onStatus('done')}
          className="shrink-0 rounded px-1 text-neutral-600 opacity-0 hover:text-emerald-300 focus:opacity-100 group-hover/sub:opacity-100 auto-light:text-neutral-400 auto-light:hover:text-emerald-700"
        >
          <Icon name="check" className="text-[14px]" />
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */

/** The project a point is in, as a chip that moves it when clicked. */
const PlaceChip = ({
  place,
  options,
  onPick,
}: {
  place: Place;
  options?: PickerOption[];
  onPick?: (option: PickerOption) => void;
}) => {
  const chip = (
    <span className="flex min-w-0 items-center gap-1.5">
      {place.kind === 'personal' ? (
        <Icon name="lock" className="text-[12px]" />
      ) : place.kind === 'none' ? (
        <span className="size-1.5 shrink-0 rounded-full border border-dashed border-neutral-500" />
      ) : (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: place.color || '#a3a3a3' }}
        />
      )}
      <span className="truncate">
        {place.kind === 'none' ? 'No project' : place.name}
      </span>
    </span>
  );
  if (!options || !onPick || place.kind === 'personal')
    return (
      <span className="flex min-w-0 max-w-[50%] items-center">{chip}</span>
    );
  return (
    <Picker
      options={options}
      onPick={onPick}
      placeholder="Move to a project…"
      trigger={
        <button
          type="button"
          title={
            place.hint
              ? `${place.name} · ${place.hint}`
              : 'Move it to a project'
          }
          className="-mx-1 flex min-w-0 max-w-[50%] items-center rounded px-1 hover:bg-white/[0.06] hover:text-neutral-200 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800"
        >
          {chip}
        </button>
      }
    />
  );
};

export const PointList = ({
  day,
  sheet,
  myTasks,
  projectsForMove,
  editable,
  focusRequest,
}: {
  day: DayLog;
  /** A row to put the cursor in, e.g. one just added from outside. */
  focusRequest?: string | null;
  /** Every point of the day, in order. */
  sheet: PointView[];
  myTasks: MyTask[];
  projectsForMove: PickerOption[];
  editable: boolean;
}) => {
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (focusRequest) setFocusId(focusRequest);
  }, [focusRequest]);
  const [adding, setAdding] = useState('');

  useEffect(() => {
    if (!focusId) return;
    const el = inputs.current.get(focusId);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      setFocusId(null);
    }
  }, [focusId, day.rows]);

  // Every editable row in the order shown, for moving with the arrows.
  const order = useMemo(
    () => sheet.filter((p) => !p.row.claude).map((p) => p.row.id),
    [sheet],
  );

  const pointsOfDay = useMemo(
    () =>
      sheet
        .filter((p) => !p.row.claude && isPoint(p.row))
        .map<PickerOption>((p) => ({
          id: `point:${rowKey(p.row)}`,
          label: p.row.text,
          hint: p.place.kind === 'none' ? undefined : p.place.name,
          group: 'Points today',
          color: p.place.color,
        })),
    [sheet],
  );
  const onDay = new Set(sheet.map((p) => p.link?.taskId).filter(Boolean));
  const projectName = (id: string) =>
    projectsForMove.find((o) => o.id === `project:${id}`)?.label ?? '';
  const taskOptions: PickerOption[] = myTasks
    .filter((t) => !onDay.has(t.id))
    .map((t) => ({
      id: `task:${t.id}`,
      label: t.title,
      hint: projectName(t.projectId),
      group: 'Your tasks',
      color: projectsForMove.find((o) => o.id === `project:${t.projectId}`)
        ?.color,
    }));
  const placeOptions = [...pointsOfDay, ...taskOptions];

  /** Where an assistant's line goes, from the "?" or the swap button. */
  const place = (row: Row, option: PickerOption) => {
    if (option.id.startsWith('point:'))
      return day.patchLink(row, { parentKey: option.id.slice(6) });
    if (option.id.startsWith('task:')) {
      const task = myTasks.find((t) => `task:${t.id}` === option.id);
      if (task)
        return day.patchLink(row, {
          projectId: task.projectId,
          taskId: task.id,
        });
    }
  };

  const move = (row: Row, option: PickerOption) => {
    if (option.id.startsWith('project:'))
      return day.patchLink(row, { projectId: option.id.slice(8) });
    if (option.id.startsWith('company:'))
      return day.patchLink(row, { companyId: option.id.slice(8) });
    return day.patchLink(row, {});
  };

  const setStatus = (view: PointView, status: PointStatus | null) => {
    if (view.row.claude) {
      if (status) day.setClaudeStatus(view.row, status);
      return;
    }
    day.editRow(view.row.id, { status });
  };

  const placeFields = (place: Place): Partial<Row> => ({
    ...(place.kind === 'personal' && { isPrivate: true }),
    ...(place.kind === 'company' &&
      place.companyId && { place: { companyId: place.companyId } }),
  });

  const onKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    view: PointView,
  ) => {
    const { row } = view;
    const el = e.currentTarget;
    const status = statusForKey(e);
    if (status) {
      e.preventDefault();
      setStatus(view, row.status === status ? null : status);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // The next point goes where this one is.
      setFocusId(
        day.addRow(view.place.section, row.id, placeFields(view.place)),
      );
      return;
    }
    if (e.key === 'Backspace' && !row.text) {
      e.preventDefault();
      const index = order.indexOf(row.id);
      if (index > 0) setFocusId(order[index - 1]);
      day.removeRow(row.id);
      return;
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const index = order.indexOf(row.id);
      if (index > 0) {
        e.preventDefault();
        setFocusId(order[index - 1]);
      }
    }
    if (e.key === 'ArrowDown' && el.selectionEnd === el.value.length) {
      const index = order.indexOf(row.id);
      if (index >= 0 && index < order.length - 1) {
        e.preventDefault();
        setFocusId(order[index + 1]);
      }
    }
  };

  const addFromInput = () => {
    const text = adding.trim();
    if (!text) return;
    day.addRow('general', null, { text });
    setAdding('');
  };

  return (
    <div className="flex flex-col">
      {sheet.map((view) => {
        const { row, task } = view;
        const moved = row.status === 'moved';
        return (
          <div
            key={row.id}
            className="group rounded-lg px-2 py-1 transition-colors focus-within:bg-white/[0.04] hover:bg-white/[0.03] auto-light:focus-within:bg-black/[0.04] auto-light:hover:bg-black/[0.03]"
          >
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                disabled={moved || (!editable && !row.claude)}
                aria-label={
                  row.status === 'done' ? 'Mark not done' : 'Mark done'
                }
                title={moved ? 'Moved on to a later day' : 'Done (Ctrl+Space)'}
                onClick={() =>
                  setStatus(view, row.status === 'done' ? null : 'done')
                }
                className="mt-[3px] text-[18px] transition-transform active:scale-90"
              >
                <StatusIcon status={row.status} />
              </button>
              <div className="min-w-0 flex-1">
                {row.claude ? (
                  <p
                    className={cn(
                      'text-sm leading-6 text-neutral-100 auto-light:text-neutral-900',
                      row.status === 'done' &&
                        'text-neutral-500 line-through auto-light:text-neutral-400',
                    )}
                  >
                    {row.text}
                  </p>
                ) : (
                  <LineInput
                    value={row.text}
                    disabled={!editable || moved}
                    inputRef={(el) => {
                      if (el) inputs.current.set(row.id, el);
                      else inputs.current.delete(row.id);
                    }}
                    onChange={(text) => day.editRow(row.id, { text })}
                    onKeyDown={(e) => onKey(e, view)}
                    placeholder="What are you working on?"
                    className={cn(
                      'text-neutral-100 auto-light:text-neutral-900',
                      (row.status === 'done' || moved) &&
                        'text-neutral-500 line-through decoration-neutral-600 auto-light:text-neutral-400 auto-light:decoration-neutral-300',
                    )}
                  />
                )}
                {isPoint(row) && (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pb-0.5 text-[11px] text-neutral-500">
                    <PlaceChip
                      place={view.place}
                      options={
                        editable && !row.claude && !moved
                          ? projectsForMove
                          : undefined
                      }
                      onPick={(o) => move(row, o)}
                    />
                    {view.origin && <OriginTag origin={view.origin} />}
                    {row.claude && (
                      <span className="flex items-center gap-1 text-orange-300/80 auto-light:text-orange-700/80">
                        <Icon name="smart_toy" className="text-[12px]" />
                        Claude
                      </span>
                    )}
                    {task && (
                      <span
                        className="flex min-w-0 items-center gap-1"
                        title="This point is a task"
                      >
                        <Icon name="task_alt" className="text-[12px]" />
                        <span className="truncate">
                          {task.title.trim().toLowerCase() !==
                          row.text.trim().toLowerCase()
                            ? task.title
                            : 'Task'}
                        </span>
                        <span className="text-neutral-600 auto-light:text-neutral-400">
                          ·{' '}
                          {TASK_STATUS_META[task.status]?.label ?? task.status}
                        </span>
                        {task.size === 'MAJOR' && (
                          <span className="text-neutral-600 auto-light:text-neutral-400">
                            · major
                          </span>
                        )}
                      </span>
                    )}
                    {moved && <span>Moved on to a later day</span>}
                  </div>
                )}
              </div>
              {view.asks && (
                <Picker
                  options={placeOptions}
                  onPick={(o) => place(row, o)}
                  placeholder="Which point is this part of?"
                  empty="No points or tasks match"
                  align="end"
                  trigger={
                    <button
                      type="button"
                      title="Claude could not tell which point this is part of. Pick one."
                      className="mt-0.5 flex h-6 shrink-0 items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 focus:outline-none focus:ring-2 focus:ring-violet-400/50 auto-light:text-violet-700"
                    >
                      ?
                      <span className="text-[11px] font-medium max-sm:hidden">
                        Which point?
                      </span>
                    </button>
                  }
                />
              )}
              {(editable || row.claude) && !moved && (
                <RowMenu
                  status={row.status}
                  onStatus={(s) => setStatus(view, s)}
                  moveOptions={row.claude ? undefined : projectsForMove}
                  onMove={(o) => move(row, o)}
                  onRemove={
                    row.claude || !editable
                      ? undefined
                      : () => day.removeRow(row.id)
                  }
                />
              )}
            </div>
            {view.subs.length > 0 && (
              <div className="ml-[13px] mt-0.5 border-l border-white/[0.07] pb-1 pl-4 auto-light:border-black/10">
                {view.subs.map((sub) => (
                  <SubLog
                    key={sub.row.id}
                    sub={sub}
                    onStatus={(s) => day.setClaudeStatus(sub.row, s)}
                    placeOptions={placeOptions.filter(
                      (o) => o.id !== `point:${rowKey(row)}`,
                    )}
                    onPlace={(o) => place(sub.row, o)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editable && (
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <Icon
            name="add"
            className="text-[18px] text-neutral-600 auto-light:text-neutral-400"
          />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromInput()}
            onBlur={addFromInput}
            placeholder={sheet.length ? 'Add a point' : 'Write the first point'}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none auto-light:text-neutral-900 auto-light:placeholder:text-neutral-400"
          />
        </div>
      )}
    </div>
  );
};
