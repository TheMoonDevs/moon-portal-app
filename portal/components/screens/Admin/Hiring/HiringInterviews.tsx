'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { verdictMeta } from '@/lib/hiring/scorecards';
import { joinLink } from '@/lib/meet/links';
import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type ApplicationRow,
  type HiringSectionProps,
  shortDay,
  shortTime,
  STAGE_META,
} from './hiringMeta';
import { ScorecardForm, ScorecardList } from './Scorecards';

interface Interview {
  id: string;
  hostId: string;
  applicationId: string;
  guestName: string;
  guestEmail: string;
  guestNote: string | null;
  start: string;
  end: string;
  status: 'PENDING' | 'PROPOSED' | 'CONFIRMED';
  meetingUrl: string | null;
}

interface InterviewOpening {
  id: string;
  title: string;
  screening: string | null;
  hiringLeadId: string | null;
}

const STATUS_META = {
  PENDING: { label: 'Needs an answer', tone: 'warning' },
  PROPOSED: { label: 'New time sent', tone: 'info' },
  CONFIRMED: { label: 'Confirmed', tone: 'positive' },
} as const;

const dayKey = (iso: string) => new Date(iso).toDateString();

/** Days from today to the next six, each with how many calls it has. */
const WeekStrip = ({ interviews }: { interviews: Interview[] }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const n = interviews.filter(
          (iv) => dayKey(iv.start) === d.toDateString(),
        ).length;
        return (
          <div
            key={d.toISOString()}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-1 py-2',
              n
                ? 'border-violet-400/30 bg-violet-500/10'
                : 'border-white/[0.07] bg-white/[0.02]',
            )}
          >
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">
              {i === 0
                ? 'Today'
                : d.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
            <span className="text-sm font-semibold text-neutral-100">
              {d.getDate()}
            </span>
            <span
              className={cn(
                'text-[10px]',
                n ? 'text-violet-200' : 'text-neutral-600',
              )}
            >
              {n ? `${n} ${n === 1 ? 'call' : 'calls'}` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Every interview booked through a meeting link, across openings: who, for
 * which opening, with whom, and the join link. After a call the interviewer
 * leaves a scorecard, saved on the applicant.
 */
export const HiringInterviews = ({
  companyId,
  users,
  openApplicant,
}: HiringSectionProps) => {
  const { user } = useUser();
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const [mineOnly, setMineOnly] = useState(false);
  const [openingId, setOpeningId] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [openings, setOpenings] = useState<InterviewOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState<Interview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/hiring/interviews?companyId=${companyId}&when=${when}`,
        null,
      );
      setInterviews(res?.data?.interviews ?? []);
      setApplications(res?.data?.applications ?? []);
      setOpenings(res?.data?.openings ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load interviews.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, when]);

  useEffect(() => {
    load();
  }, [load]);

  const appOf = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );
  const openingOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o])),
    [openings],
  );
  const nameOf = (id: string) => users.find((u) => u.id === id);

  const visible = interviews.filter((iv) => {
    if (mineOnly && iv.hostId !== user?.id) return false;
    if (openingId && appOf.get(iv.applicationId)?.openingId !== openingId)
      return false;
    return true;
  });
  const groups: Array<{ day: string; rows: Interview[] }> = [];
  for (const iv of visible) {
    const key = dayKey(iv.start);
    const group = groups.find((g) => g.day === key);
    if (group) group.rows.push(iv);
    else groups.push({ day: key, rows: [iv] });
  }
  const unscored =
    when === 'past'
      ? visible.filter(
          (iv) =>
            !(appOf.get(iv.applicationId)?.scorecards ?? []).some(
              (s) => s.bookingId === iv.id,
            ),
        ).length
      : 0;

  const scoringApp = scoring ? appOf.get(scoring.applicationId) : null;
  const scoringOpening = scoringApp
    ? openingOf.get(scoringApp.openingId)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={when}
          onChange={setWhen}
          options={[
            { value: 'upcoming', label: 'Upcoming', icon: 'event_upcoming' },
            { value: 'past', label: 'Past', icon: 'history' },
          ]}
        />
        <Segmented
          value={mineOnly ? 'mine' : 'all'}
          onChange={(v) => setMineOnly(v === 'mine')}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
        <div className="flex-1" />
        <NativeSelect
          aria-label="Opening"
          value={openingId}
          onChange={(e) => setOpeningId(e.target.value)}
          className="h-9 w-52 text-xs"
        >
          <option value="">Every opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </NativeSelect>
      </div>

      {when === 'upcoming' && !loading && <WeekStrip interviews={visible} />}
      {when === 'past' && unscored > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <Icon name="rate_review" className="text-[16px]" />
          {unscored} {unscored === 1 ? 'call has' : 'calls have'} no scorecard
          yet.
        </p>
      )}

      <Panel className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : !groups.length ? (
          <EmptyState
            icon="event_available"
            title={
              when === 'upcoming'
                ? 'No interviews booked'
                : 'No past interviews'
            }
            description="Interviews show up here when applicants book through a meeting link, like the one in the Interview email."
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {groups.map((group) => (
              <section key={group.day} className="flex flex-col">
                <h3 className="bg-white/[0.02] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  {shortDay(group.rows[0].start)}
                </h3>
                <ul className="divide-y divide-white/[0.04]">
                  {group.rows.map((iv) => {
                    const app = appOf.get(iv.applicationId);
                    const opening = app ? openingOf.get(app.openingId) : null;
                    const host = nameOf(iv.hostId);
                    const status = STATUS_META[iv.status];
                    const stage = app ? STAGE_META[app.stage] : null;
                    const cards = (app?.scorecards ?? []).filter(
                      (s) => s.bookingId === iv.id,
                    );
                    return (
                      <li
                        key={iv.id}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <span className="w-40 shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-neutral-200">
                          {shortTime(iv.start)}
                          <span className="text-neutral-500">
                            –{shortTime(iv.end)}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => app && openApplicant(app)}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm text-neutral-100">
                              {app?.name ?? iv.guestName}
                            </span>
                            {when === 'upcoming' && (
                              <Pill tone={status.tone}>{status.label}</Pill>
                            )}
                            {stage && (
                              <Pill tone={stage.tone}>{stage.label}</Pill>
                            )}
                            {cards.map((c) => (
                              <Pill
                                key={c.id}
                                tone={verdictMeta(c.verdict)?.tone}
                              >
                                {verdictMeta(c.verdict)?.label}
                              </Pill>
                            ))}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {opening?.title ?? 'An opening'}
                            {iv.guestNote ? ` · “${iv.guestNote}”` : ''}
                          </span>
                        </button>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className="flex items-center gap-1.5 text-xs text-neutral-400"
                            title="Interviewer"
                          >
                            <UserAvatar
                              src={host?.avatar}
                              name={host?.name}
                              size={22}
                            />
                            {host?.name?.split(/\s+/)[0] ?? 'Teammate'}
                          </span>
                          {when === 'upcoming' && iv.meetingUrl && (
                            <AdminButton
                              size="sm"
                              tone="primary"
                              icon="videocam"
                              onClick={() =>
                                window.open(joinLink('', iv, 'host'), '_blank')
                              }
                            >
                              Join
                            </AdminButton>
                          )}
                          {app && (
                            <AdminButton
                              size="sm"
                              icon="rate_review"
                              onClick={() => setScoring(iv)}
                            >
                              {cards.some((c) => c.byUserId === user?.id)
                                ? 'Scorecard'
                                : 'Score'}
                            </AdminButton>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <AdminModal
        open={!!scoring && !!scoringApp}
        onOpenChange={(open) => !open && setScoring(null)}
        size="md"
        icon="rate_review"
        title={scoringApp ? `Scorecard: ${scoringApp.name}` : 'Scorecard'}
        description={
          scoring
            ? `${scoringOpening?.title ?? ''} · ${shortDay(scoring.start)}, ${shortTime(scoring.start)}`
            : undefined
        }
      >
        {scoring && scoringApp && (
          <div className="flex flex-col gap-5">
            <ScorecardForm
              key={scoring.id}
              application={scoringApp}
              screening={scoringOpening?.screening}
              bookingId={scoring.id}
              onCancel={() => setScoring(null)}
              onSaved={(updated) => {
                setApplications((rows) =>
                  rows.map((a) => (a.id === updated.id ? updated : a)),
                );
                setScoring(null);
              }}
            />
            {(scoringApp.scorecards ?? []).some(
              (s) => s.byUserId !== user?.id,
            ) && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Other scorecards
                </p>
                <ScorecardList
                  scorecards={(scoringApp.scorecards ?? []).filter(
                    (s) => s.byUserId !== user?.id,
                  )}
                  users={users}
                />
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
};
