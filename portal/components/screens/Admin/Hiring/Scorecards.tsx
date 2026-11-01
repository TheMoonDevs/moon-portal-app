'use client';

import type { User } from '@db/client';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  averageRating,
  RATING_LABELS,
  requirementsFromScreening,
  verdictMeta,
  VERDICTS,
} from '@/lib/hiring/scorecards';
import { cn } from '@/lib/utils';
import type { Scorecard, ScorecardVerdict } from '@/models/hiring';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, Field, Pill, TextArea } from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { type ApplicationRow, timeAgo } from './hiringMeta';

/** Four dots to rate one requirement. */
const RatingDots = ({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) => (
  <span className="flex items-center gap-1">
    {[1, 2, 3, 4].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        title={RATING_LABELS[n]}
        aria-label={`${RATING_LABELS[n]} (${n} of 4)`}
        onClick={() => onChange?.(n === value ? 0 : n)}
        className={cn(
          'size-4 rounded-full border transition-colors',
          n <= value
            ? 'border-violet-300 bg-violet-400'
            : 'border-white/20 bg-transparent',
          onChange && 'hover:border-violet-300',
        )}
      />
    ))}
    <span className="ml-1 w-12 text-[11px] text-neutral-500">
      {RATING_LABELS[value] ?? ''}
    </span>
  </span>
);

/** The interviewer's scorecard for one call: ratings, verdict and notes. */
export const ScorecardForm = ({
  application,
  screening,
  bookingId,
  onSaved,
  onCancel,
}: {
  application: ApplicationRow;
  /** The opening's screening requirements, which become the rows. */
  screening?: string | null;
  bookingId?: string | null;
  onSaved: (application: ApplicationRow) => void;
  onCancel?: () => void;
}) => {
  const { user } = useUser();
  const mine = (application.scorecards ?? []).find(
    (s) =>
      s.byUserId === user?.id && (s.bookingId ?? null) === (bookingId ?? null),
  );
  const requirements = requirementsFromScreening(screening);
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      requirements.map((r) => [
        r,
        mine?.ratings.find((x) => x.requirement === r)?.rating ?? 0,
      ]),
    ),
  );
  const [verdict, setVerdict] = useState<ScorecardVerdict | null>(
    mine?.verdict ?? null,
  );
  const [notes, setNotes] = useState(mine?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!verdict) return;
    setSaving(true);
    try {
      const res = await PortalSdk.postData(
        `/api/hiring/applications/${application.id}/scorecard`,
        {
          bookingId: bookingId ?? null,
          verdict,
          notes,
          ratings: Object.entries(ratings)
            .filter(([, rating]) => rating > 0)
            .map(([requirement, rating]) => ({ requirement, rating })),
        },
      );
      onSaved(res.data.application);
      toast.success('Scorecard saved');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Against the screening requirements"
        hint={
          screening
            ? 'From the opening’s screening requirements. Leave any you didn’t cover.'
            : 'This opening has no screening requirements yet, so these are general.'
        }
      >
        <ul className="flex flex-col divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
          {requirements.map((r) => (
            <li
              key={r}
              className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1 text-sm text-neutral-200">
                {r}
              </span>
              <RatingDots
                value={ratings[r] ?? 0}
                onChange={(value) =>
                  setRatings((current) => ({ ...current, [r]: value }))
                }
              />
            </li>
          ))}
        </ul>
      </Field>
      <Field label="Verdict" required>
        <div className="flex flex-wrap gap-2">
          {VERDICTS.map((v) => (
            <AdminButton
              key={v.value}
              size="sm"
              tone={verdict === v.value ? 'primary' : 'secondary'}
              onClick={() => setVerdict(v.value)}
            >
              {v.label}
            </AdminButton>
          ))}
        </div>
      </Field>
      <Field label="Notes">
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What stood out, what to check next…"
        />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <AdminButton tone="ghost" size="sm" onClick={onCancel}>
            Cancel
          </AdminButton>
        )}
        <AdminButton
          tone="primary"
          size="sm"
          icon="check"
          disabled={!verdict}
          loading={saving}
          onClick={save}
        >
          {mine ? 'Update scorecard' : 'Save scorecard'}
        </AdminButton>
      </div>
    </div>
  );
};

/** The scorecards left on an applicant, newest first. */
export const ScorecardList = ({
  scorecards,
  users,
}: {
  scorecards: Scorecard[];
  users: User[];
}) => {
  if (!scorecards.length) return null;
  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.name || 'A teammate';
  return (
    <ul className="flex flex-col gap-2">
      {[...scorecards]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((card) => {
          const verdict = verdictMeta(card.verdict);
          const avg = averageRating(card.ratings);
          return (
            <li
              key={card.id}
              className="flex flex-col gap-2 rounded-xl border border-white/[0.07] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={verdict?.tone}>{verdict?.label}</Pill>
                {avg !== null && (
                  <span className="text-xs text-neutral-400">
                    {avg} / 4 on {card.ratings.length}{' '}
                    {card.ratings.length === 1 ? 'requirement' : 'requirements'}
                  </span>
                )}
                <span className="ml-auto text-[11px] text-neutral-500">
                  {nameOf(card.byUserId)} · {timeAgo(card.at)}
                </span>
              </div>
              {card.ratings.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {card.ratings.map((r) => (
                    <li
                      key={r.requirement}
                      className="flex items-center gap-3 text-xs text-neutral-400"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {r.requirement}
                      </span>
                      <RatingDots value={r.rating} />
                    </li>
                  ))}
                </ul>
              )}
              {card.notes && (
                <p className="whitespace-pre-wrap text-xs text-neutral-300">
                  {card.notes}
                </p>
              )}
            </li>
          );
        })}
    </ul>
  );
};
