import { addPoint, todayOf } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { sendPushToUsers } from '@/lib/push/server';
import { NotificationType } from '@/models/shared/enums';
import type { Task } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

/*
 * Giving a task to someone else from the worklog page. Shifting hands it
 * over (it leaves the giver's day and lands on theirs); assigning keeps the
 * giver on it too. Either way the note the giver wrote goes into the task's
 * info, a work point says what happened, and the new person gets a portal
 * notification and a push.
 */

export const MAX_ASSIGN_NOTE = 2000;

const MATCH_TYPE = 'TaskAssign';

export class AssignError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Who = { id: string; name?: string | null; username?: string | null };

const nameOf = (u: Who | null | undefined) =>
  u?.name?.trim() || u?.username || 'Someone';

/** The note added to the task's info, under who wrote it and when. */
export function withNote(
  description: string | null | undefined,
  note: string,
  from: string,
  day: string,
) {
  const text = note.trim();
  if (!text) return description ?? null;
  const block = `Note from ${from} (${day}):\n${text}`;
  return description?.trim() ? `${description.trim()}\n\n${block}` : block;
}

export async function assignTask(
  task: Task,
  by: Who,
  input: {
    userId: string;
    note?: string;
    keep?: boolean;
    /** `person`, or the assistant that did it for them (e.g. `claude`). */
    via?: string;
  },
): Promise<Task> {
  if (!task.companyId || !task.projectId)
    throw new AssignError(
      400,
      'Put the task in a project first, then it can be given to someone.',
    );
  const company = await db.company.findFirst({
    where: { id: task.companyId },
    select: { id: true, isPersonal: true },
  });
  if (!company || company.isPersonal)
    throw new AssignError(400, 'Personal tasks stay yours alone.');
  const member = await db.companyMember.findFirst({
    where: {
      companyId: task.companyId,
      userId: input.userId,
      status: MEMBER_STATUS.ACTIVE,
    },
  });
  if (!member)
    throw new AssignError(400, 'They are not in this task’s company.');
  const target: Who | null = await db.user.findFirst({
    where: { id: input.userId },
    select: { id: true, name: true, username: true },
  });
  if (!target) throw new AssignError(404, 'Person not found.');

  const note = (input.note ?? '').trim().slice(0, MAX_ASSIGN_NOTE);
  const shift = !input.keep && input.userId !== by.id;
  const before = task.assigneeIds ?? [];
  const already = before.includes(input.userId);
  const day = await todayOf(by.id);
  const at = new Date().toISOString();
  const updated: Task = await db.task.update({
    where: { id: task.id },
    data: {
      // Shifted: theirs alone, on their day. Assigned: they join it.
      assigneeIds: shift
        ? [input.userId]
        : Array.from(new Set([...before, input.userId])),
      ...(shift && { ownerId: input.userId }),
      description: withNote(task.description, note, nameOf(by), day),
      updatedAt: at,
    },
  });
  await addPoint({
    task: updated,
    userId: by.id,
    date: day,
    text: `${shift ? 'Shifted to' : 'Assigned to'} ${nameOf(target)}${note ? `: ${note}` : ''}`,
    by: input.via ?? 'person',
  });

  if (input.userId !== by.id && (!already || shift || note))
    await notifyAssigned({
      task: updated,
      to: input.userId,
      by,
      shift,
      note,
    }).catch((e) => console.error('[tasks] assign notification failed', e));
  return updated;
}

/** Tells each person newly put on a task, e.g. by changing its people. */
export async function notifyNewAssignees(before: Task, after: Task, by: Who) {
  const added = (after.assigneeIds ?? []).filter(
    (id) => id !== by.id && !(before.assigneeIds ?? []).includes(id),
  );
  for (const to of added)
    await notifyAssigned({ task: after, to, by, shift: false, note: '' }).catch(
      (e) => console.error('[tasks] assign notification failed', e),
    );
}

async function notifyAssigned({
  task,
  to,
  by,
  shift,
  note,
}: {
  task: Task;
  to: string;
  by: Who;
  shift: boolean;
  note: string;
}) {
  await ensureNotificationsReset();
  const url = `/user/worklogs${task.forDate ? `?date=${task.forDate}` : ''}`;
  const title = `${nameOf(by)} ${shift ? 'shifted a task to you' : 'assigned you a task'}`;
  const description = note ? `${task.title}\n${note}` : task.title;
  const at = new Date();
  await db.notification.create({
    data: {
      userId: to,
      title,
      description,
      matchId: task.id,
      matchType: MATCH_TYPE,
      notificationType: NotificationType.USER_TO_USER,
      notificationData: {
        kind: 'TASK_ASSIGNED',
        taskId: task.id,
        byId: by.id,
        shift,
        actions: [{ title: 'Open', trigger_type: 'link', trigger: url }],
        actionDone: true,
      },
      isRead: false,
      createdAt: at,
      updatedAt: at,
    },
  });
  await sendPushToUsers([to], {
    title,
    body: task.title,
    url,
    tag: `task-${task.id}`,
  }).catch((e) => console.error('[tasks] push failed', e));
}
