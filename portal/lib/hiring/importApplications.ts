import { db } from '@/lib/mongodb/db-client';
import { nowIso } from '@/lib/workspace/server';
import type {
  ApplicationAnswer,
  ApplicationEvent,
  JobApplication,
  JobOpening,
} from '@/models/hiring';
import { APPLICATION_STAGE } from '@/models/hiring';

import { MAX_LONG_ANSWER, validateApplicant } from './forms';
import {
  importAnswer,
  type ImportRow,
  MAX_IMPORT_ROWS,
  normalizeLabel,
  stageFromText,
} from './importRows';

/*
 * Adds applicants from an earlier spreadsheet to an opening, for the hiring
 * tab's "Import from a sheet" and the Claude connector. Callers check the
 * person's `hiring:edit` permission first.
 */

export interface ImportSkip {
  /** 1-based, in the order the rows were given. */
  row: number;
  name: string;
  email: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: ImportSkip[];
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, max)
    : '';

function appliedAt(value: unknown, now: string): string {
  const parsed =
    typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return now;
  // A date in the future is a typo; an import can't predate the web.
  if (parsed.toISOString() > now || parsed.getFullYear() < 2000) return now;
  return parsed.toISOString();
}

export async function importApplications(
  userId: string,
  opening: JobOpening,
  rows: ImportRow[],
  {
    defaultStage = APPLICATION_STAGE.APPLIED,
    source = null,
  }: { defaultStage?: APPLICATION_STAGE; source?: string | null } = {},
): Promise<ImportResult> {
  const now = nowIso();
  const fields = opening.fields ?? [];
  const fieldFor = (key: string) =>
    fields.find((f) => f.id === key) ??
    fields.find((f) => normalizeLabel(f.label) === normalizeLabel(key));

  const existing: Array<{ email: string }> = await db.jobApplication.findMany({
    where: { openingId: opening.id },
    select: { email: true },
  });
  const taken = new Set(existing.map((a) => a.email));

  const skipped: ImportSkip[] = [];
  // By email; a later submission of the same person replaces an earlier one.
  const ready = new Map<
    string,
    { row: number; data: Partial<JobApplication> }
  >();

  rows.slice(0, MAX_IMPORT_ROWS).forEach((raw, index) => {
    const row = index + 1;
    const email = text(raw?.email, 254).toLowerCase();
    const named = text(raw?.name, 120);
    const applicant = validateApplicant({
      name: named || email.split('@')[0],
      email,
    });
    if (applicant.errors.email) {
      skipped.push({
        row,
        name: named,
        email,
        reason: email ? 'Email doesn’t look right' : 'No email',
      });
      return;
    }
    if (taken.has(applicant.email)) {
      skipped.push({
        row,
        name: applicant.name,
        email: applicant.email,
        reason: 'Already in this opening',
      });
      return;
    }

    const answers: Record<string, ApplicationAnswer> = {};
    const extra: string[] = [];
    for (const [key, value] of Object.entries(raw?.answers ?? {})) {
      const field = fieldFor(key);
      if (!field) {
        const line = text(
          Array.isArray(value) ? value.join(', ') : value,
          2000,
        );
        if (line) extra.push(`${key}: ${line}`);
        continue;
      }
      const answer = importAnswer(field, value);
      if (answer !== null) answers[field.id] = answer;
    }
    const notes = [text(raw?.notes, MAX_LONG_ANSWER), ...extra]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_LONG_ANSWER);

    const submittedAt = appliedAt(raw?.submittedAt, now);
    const stage = stageFromText(raw?.stage) ?? defaultStage;
    const history: ApplicationEvent[] = [
      {
        type: 'SUBMITTED',
        at: submittedAt,
        byUserId: userId,
        to: APPLICATION_STAGE.APPLIED,
        text: source,
      },
    ];
    if (stage !== APPLICATION_STAGE.APPLIED)
      history.push({
        type: 'STAGE_CHANGED',
        at: now,
        byUserId: userId,
        from: APPLICATION_STAGE.APPLIED,
        to: stage,
      });

    const earlier = ready.get(applicant.email);
    if (earlier) {
      const keepEarlier = String(earlier.data.submittedAt) > submittedAt;
      skipped.push({
        row: keepEarlier ? row : earlier.row,
        name: applicant.name,
        email: applicant.email,
        reason: 'Applied more than once; kept the latest',
      });
      if (keepEarlier) return;
    }
    ready.set(applicant.email, {
      row,
      data: {
        companyId: opening.companyId,
        openingId: opening.id,
        name: applicant.name,
        email: applicant.email,
        answers,
        stage,
        notes: notes || null,
        history,
        submittedAt,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  const data = Array.from(ready.values()).map((r) => r.data);
  if (data.length) await db.jobApplication.createMany({ data });
  return {
    imported: data.length,
    skipped: skipped.sort((a, b) => a.row - b.row),
  };
}
