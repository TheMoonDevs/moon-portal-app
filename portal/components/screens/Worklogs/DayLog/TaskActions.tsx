'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';

/*
 * What can be done to a task besides its status: give it to someone in its
 * company (with a note on what they should know) or write its info, the
 * words on how it is to be done. The Actions button under an open task and
 * the menu on each of Your tasks open the same two dialogs.
 */

export type ActionTask = {
  id: string;
  title: string;
  description?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  assigneeIds?: string[];
};

export type TaskAction = 'assign' | 'info';

/** Personal tasks, and tasks in no project, stay their owner's. */
export const canAssign = (
  task: ActionTask,
  personal: (companyId?: string | null) => boolean,
) => !!task.projectId && !!task.companyId && !personal(task.companyId);

const panel =
  'auto-theme fixed left-1/2 top-[12vh] z-[1400] flex max-h-[76vh] w-[min(460px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-neutral-200 shadow-2xl shadow-black/60 focus:outline-none auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/15';

const field =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-white/25 focus:outline-none auto-light:border-black/10 auto-light:bg-black/[0.02] auto-light:text-neutral-900 auto-light:placeholder:text-neutral-400 auto-light:focus:border-black/25';

const Shell = ({
  open,
  onClose,
  icon,
  title,
  task,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  task: ActionTask;
  children: ReactNode;
  footer: ReactNode;
}) => (
  <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[1390] bg-black/50 backdrop-blur-[2px]" />
      <Dialog.Content className={panel} aria-describedby={undefined}>
        <div className="flex items-start gap-3 border-b border-white/[0.07] px-4 py-3 auto-light:border-black/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[18px] text-neutral-300 auto-light:bg-black/[0.05] auto-light:text-neutral-700">
            <Icon name={icon} />
          </span>
          <div className="min-w-0 flex-1">
            <Dialog.Title className="text-sm font-semibold text-white auto-light:text-neutral-950">
              {title}
            </Dialog.Title>
            <p className="truncate text-xs text-neutral-500">{task.title}</p>
          </div>
          <Dialog.Close
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800"
          >
            <Icon name="close" className="text-[18px]" />
          </Dialog.Close>
        </div>
        <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-4 py-3 auto-light:border-black/10">
          {footer}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

const PrimaryButton = ({
  disabled,
  busy,
  onClick,
  children,
}: {
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled || busy}
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-40 auto-light:bg-neutral-900 auto-light:text-white auto-light:hover:bg-neutral-700"
  >
    {busy && <Spin className="size-3" />}
    {children}
  </button>
);

const CancelButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200 auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800"
  >
    Cancel
  </button>
);

type Member = {
  userId: string;
  title?: string | null;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    positionTitle?: string | null;
  } | null;
};

/** Each company's people, read once per page. */
const membersCache = new Map<string, Promise<Member[]>>();
const membersOf = (companyId: string) => {
  if (!membersCache.has(companyId))
    membersCache.set(
      companyId,
      PortalSdk.getData(`/api/companies/${companyId}/members`, null)
        .then((res) => (res?.data?.members ?? []) as Member[])
        .catch((e) => {
          membersCache.delete(companyId);
          throw e;
        }),
    );
  return membersCache.get(companyId)!;
};

const nameOf = (m: Member) =>
  m.user?.name?.trim() || m.user?.username || 'Someone';

export const PersonAvatar = ({
  name,
  avatar,
  className,
}: {
  name: string;
  avatar?: string | null;
  className?: string;
}) =>
  avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt=""
      className={cn('size-7 shrink-0 rounded-full object-cover', className)}
    />
  ) : (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold uppercase text-neutral-300 auto-light:bg-black/[0.06] auto-light:text-neutral-600',
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );

/** Give the task to someone in its company, with a note for them. */
export const AssignDialog = ({
  task,
  open,
  onClose,
  onDone,
}: {
  task: ActionTask;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) => {
  const { user } = useUser();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setNote('');
    setKeep(false);
    setQuery('');
    if (!task.companyId) return;
    setMembers(null);
    membersOf(task.companyId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [open, task.companyId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => m.userId !== user?.id)
      .filter(
        (m) =>
          !q ||
          `${nameOf(m)} ${m.user?.username ?? ''} ${m.title ?? m.user?.positionTitle ?? ''}`
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }, [members, query, user?.id]);
  const who = members?.find((m) => m.userId === picked);

  const submit = async () => {
    if (!picked || busy) return;
    setBusy(true);
    try {
      await PortalSdk.postData(`/api/tasks/${task.id}/assign`, {
        userId: picked,
        note,
        keep,
      });
      toast.success(
        `${keep ? 'Assigned to' : 'Shifted to'} ${who ? nameOf(who) : 'them'}. They have been notified.`,
      );
      onDone();
      onClose();
    } catch (err) {
      toast.error((err as any)?.error ?? 'Could not give the task.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      open={open}
      onClose={onClose}
      icon="person_add"
      title="Assign to"
      task={task}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton disabled={!picked} busy={busy} onClick={submit}>
            {keep ? 'Assign' : 'Shift to them'}
          </PrimaryButton>
        </>
      }
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find someone in the company…"
        className={field}
      />
      <div className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {!members ? (
          <div className="flex justify-center py-4">
            <Spin className="size-4" />
          </div>
        ) : shown.length ? (
          shown.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => setPicked(m.userId)}
              aria-pressed={picked === m.userId}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                picked === m.userId
                  ? 'bg-white/[0.08] auto-light:bg-black/[0.06]'
                  : 'hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]',
              )}
            >
              <PersonAvatar name={nameOf(m)} avatar={m.user?.avatar} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-100 auto-light:text-neutral-900">
                  {nameOf(m)}
                </span>
                {(m.title || m.user?.positionTitle) && (
                  <span className="block truncate text-[11px] text-neutral-500">
                    {m.title || m.user?.positionTitle}
                  </span>
                )}
              </span>
              {(task.assigneeIds ?? []).includes(m.userId) && (
                <span className="text-[10px] text-neutral-500">On it</span>
              )}
              {picked === m.userId && (
                <Icon
                  name="check_circle"
                  filled
                  className="text-[18px] text-emerald-400 auto-light:text-emerald-600"
                />
              )}
            </button>
          ))
        ) : (
          <p className="px-2 py-3 text-sm text-neutral-500">
            {members.length > 1
              ? 'Nobody matches.'
              : 'Nobody else is here yet.'}
          </p>
        )}
      </div>
      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        Note for them
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="What should be added or done, links, anything they need to know…"
        className={cn(field, 'mt-1 resize-y leading-5')}
      />
      <p className="mt-1 text-[11px] text-neutral-500">
        The note goes into the task’s info. They get a notification.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-neutral-300 auto-light:text-neutral-700">
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => setKeep(e.target.checked)}
          className="mt-0.5 accent-emerald-500"
        />
        <span>
          Keep me on it too
          <span className="block text-[11px] text-neutral-500">
            Off: the task is shifted to them and leaves your day.
          </span>
        </span>
      </label>
    </Shell>
  );
};

/** Write the task's info: how it is to be done, links, anything to know. */
export const InfoDialog = ({
  task,
  open,
  onClose,
  onDone,
}: {
  task: ActionTask;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setText(task.description ?? '');
  }, [open, task.description]);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, {
        description: text.trim() || null,
      });
      toast.success('Info saved');
      onDone();
      onClose();
    } catch (err) {
      toast.error((err as any)?.error ?? 'Could not save the info.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell
      open={open}
      onClose={onClose}
      icon="description"
      title="Add info"
      task={task}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton
            busy={busy}
            disabled={(task.description ?? '') === text}
            onClick={submit}
          >
            Save
          </PrimaryButton>
        </>
      }
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={8}
        maxLength={10000}
        placeholder="How it is to be done, links, what to keep in mind…"
        className={cn(field, 'resize-y leading-5')}
      />
      <p className="mt-1 text-[11px] text-neutral-500">
        Shows under the “i” after the task. Cmd+Enter saves.
      </p>
    </Shell>
  );
};

/** The Actions button under an open task, with its menu. */
export const ActionsMenu = ({
  assignable,
  onPick,
}: {
  assignable: boolean;
  onPick: (action: TaskAction) => void;
}) => {
  const [open, setOpen] = useState(false);
  const item =
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent auto-light:hover:bg-black/[0.06]';
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded px-1 hover:bg-white/[0.06] hover:text-neutral-300 data-[state=open]:bg-white/[0.06] data-[state=open]:text-neutral-300 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-700 auto-light:data-[state=open]:bg-black/[0.06]"
        >
          <Icon name="bolt" className="text-[13px]" />
          Actions
          <Icon name="expand_more" className="text-[13px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          className="auto-theme z-[1300] w-56 rounded-xl border border-white/10 bg-neutral-900 p-1 text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          <button
            type="button"
            disabled={!assignable}
            title={
              assignable
                ? undefined
                : 'Personal tasks and tasks in no project stay yours'
            }
            onClick={() => {
              setOpen(false);
              setTimeout(() => onPick('assign'), 0);
            }}
            className={item}
          >
            <Icon
              name="person_add"
              className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
            />
            Assign to…
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setTimeout(() => onPick('info'), 0);
            }}
            className={item}
          >
            <Icon
              name="description"
              className="text-[16px] text-neutral-400 auto-light:text-neutral-500"
            />
            Add info…
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/** The two dialogs, for whichever task and action is open. */
export const TaskActionDialogs = ({
  task,
  action,
  onClose,
  onDone,
}: {
  task: ActionTask | null;
  action: TaskAction | null;
  onClose: () => void;
  onDone: () => void;
}) =>
  task ? (
    <>
      <AssignDialog
        task={task}
        open={action === 'assign'}
        onClose={onClose}
        onDone={onDone}
      />
      <InfoDialog
        task={task}
        open={action === 'info'}
        onClose={onClose}
        onDone={onDone}
      />
    </>
  ) : null;
