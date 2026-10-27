import type { Metadata } from 'next';

import {
  type PublicTask,
  TaskLinkMissing,
  TaskPage,
} from '@/components/screens/Task/TaskPage';
import { requireOpeningPermission } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import type { Company } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Props = {
  params: { openingId: string };
  searchParams: { name?: string };
};

export const metadata: Metadata = {
  title: 'Task page preview',
  robots: { index: false, follow: false },
};

/**
 * The hiring team's look at an opening's task page, as a candidate would see
 * it. `?name=` picks the first name it greets; the form sends nothing.
 */
export default async function TaskPreview({ params, searchParams }: Props) {
  const { response, user, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:read',
  );
  if (response || !opening?.task) return <TaskLinkMissing />;
  const company: Company | null = await db.company.findFirst({
    where: { id: opening.companyId },
  });

  const task = opening.task;
  const name =
    searchParams.name?.trim().slice(0, 40) ||
    user?.name?.trim().split(/\s+/)[0] ||
    'Alex';
  const due = new Date();
  if (task.dueDays) due.setDate(due.getDate() + task.dueDays);
  const data: PublicTask = {
    token: 'preview',
    preview: true,
    firstName: name,
    role: opening.title,
    company: company?.name ?? 'The Moon Devs',
    task: {
      page: task.page ?? null,
      brief: task.brief,
      effort: task.effort ?? null,
      deliverables: task.deliverables ?? [],
      closing: task.closing ?? null,
      fields: task.fields ?? [],
    },
    dueAt: task.dueDays ? due.toISOString() : null,
    canSubmit: true,
    submission: null,
  };
  return <TaskPage data={data} />;
}
