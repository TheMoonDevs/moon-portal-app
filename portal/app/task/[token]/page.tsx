import type { Metadata } from 'next';
import { cache } from 'react';

import {
  type PublicTask,
  TaskLinkMissing,
  TaskPage,
} from '@/components/screens/Task/TaskPage';
import { answerText } from '@/lib/hiring/forms';
import {
  canSubmitTask,
  TASK_TOKEN_PATTERN,
  taskDueAt,
} from '@/lib/hiring/tasks';
import { db } from '@/lib/mongodb/db-client';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { FORM_FIELD_TYPE } from '@/models/hiring';
import type { Company } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Props = { params: { token: string } };

/** The task behind a link, with only what the candidate may see. */
const loadTask = cache(async (token: string): Promise<PublicTask | null> => {
  if (!TASK_TOKEN_PATTERN.test(token)) return null;
  const application: JobApplication | null = await db.jobApplication.findFirst({
    where: { taskToken: token },
  });
  if (!application) return null;
  const opening: JobOpening | null = await db.jobOpening.findFirst({
    where: { id: application.openingId },
  });
  if (!opening?.task) return null;
  const company: Company | null = await db.company.findFirst({
    where: { id: opening.companyId },
  });

  const task = opening.task;
  const sent = application.taskSubmission;
  const due = taskDueAt(task, application.taskSentAt);
  const name = application.name.trim();
  return {
    token,
    firstName: name.split(/\s+/)[0] || name,
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
    dueAt: due ? due.toISOString() : null,
    canSubmit: canSubmitTask(task, application),
    submission: sent
      ? {
          submittedAt: sent.submittedAt,
          answers: task.fields
            .filter((f) => sent.answers?.[f.id] !== undefined)
            .map((f) => ({
              id: f.id,
              label: f.label,
              text: answerText(sent.answers[f.id]),
              isFile: f.type === FORM_FIELD_TYPE.FILE,
            })),
        }
      : null,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const task = await loadTask(params.token);
  return {
    title: task
      ? `${task.firstName}, this is for you · ${task.company}`
      : 'Link not found',
    robots: { index: false, follow: false },
  };
}

export default async function Task({ params }: Props) {
  const task = await loadTask(params.token);
  if (!task) return <TaskLinkMissing />;
  return <TaskPage data={task} />;
}
