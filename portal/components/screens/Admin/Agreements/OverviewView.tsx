'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AgreementsDashboard } from '@/lib/agreements/dashboard';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  EmptyState,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
  StatCard,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { day, when } from './meta';

/*
 * Agreements > Overview: what needs chasing. What's out and stuck, what waits
 * on the company, what was declined, how long signing takes, who is missing a
 * required document, what ends soon, and how policy rollouts are going.
 */

type Item = AgreementsDashboard['stuck'][number];

const hoursText = (h: number | null) =>
  h === null
    ? '—'
    : h < 1
      ? 'under an hour'
      : h < 48
        ? `${Math.round(h)} hours`
        : `${Math.round(h / 24)} days`;

/** Signed per week, the last eight weeks. One series: one hue, no legend. */
const WeeksChart = ({ weeks }: { weeks: AgreementsDashboard['weeks'] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.signed, w.sent)));
  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex h-28 items-end gap-[2px] border-b border-white/10"
        onMouseLeave={() => setHover(null)}
      >
        {weeks.map((w, i) => (
          <button
            key={w.weekOf}
            type="button"
            aria-label={`Week of ${day(w.weekOf)}: ${w.signed} signed, ${w.sent} sent`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            className="group flex h-full flex-1 items-end justify-center"
          >
            <span
              className={cn(
                'w-full max-w-[28px] rounded-t-[4px] bg-sky-400/80 transition-colors',
                hover === i && 'bg-sky-300',
              )}
              style={{
                height: `${w.signed ? Math.max(4, (w.signed / max) * 100) : 0}%`,
              }}
            />
          </button>
        ))}
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: `${((hover + 0.5) / weeks.length) * 100}%` }}
          >
            <p className="text-neutral-400">
              Week of {day(weeks[hover].weekOf)}
            </p>
            <p className="font-medium text-white">
              {weeks[hover].signed} signed · {weeks[hover].sent} sent
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500">
        <span>{day(weeks[0]?.weekOf)}</span>
        <span>This week</span>
      </div>
    </div>
  );
};

const Row = ({
  item,
  right,
  sub,
  onOpen,
}: {
  item: Pick<Item, 'id' | 'source' | 'title' | 'people' | 'link'>;
  right?: React.ReactNode;
  sub?: React.ReactNode;
  onOpen: (id: string, source: string, link: string | null) => void;
}) => (
  <li>
    <button
      type="button"
      onClick={() => onOpen(item.id, item.source, item.link)}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{item.title}</p>
        <p className="truncate text-xs text-neutral-500">
          {sub ?? item.people.join(', ')}
        </p>
      </div>
      {right}
    </button>
  </li>
);

export const OverviewView = ({
  companyId,
  refreshKey,
  onOpen,
  onShow,
}: {
  companyId: string;
  refreshKey: number;
  onOpen: (id: string, source: string, link: string | null) => void;
  /** Go to another part of the tab. */
  onShow: (view: 'documents' | 'people' | 'policies') => void;
}) => {
  const [data, setData] = useState<AgreementsDashboard | null>(null);

  useEffect(() => {
    setData(null);
    PortalSdk.getData(`/api/documents/dashboard?companyId=${companyId}`, null)
      .then((res) => setData(res?.data?.dashboard ?? null))
      .catch((err) => toast.error(errorText(err)));
  }, [companyId, refreshKey]);

  const c = data?.counts;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Out for signing"
          value={c?.out ?? 0}
          icon="pending"
          tone="info"
          loading={!data}
          hint={c ? `${c.stuck} stuck a week or more` : undefined}
          onClick={() => onShow('documents')}
        />
        <StatCard
          label="Waiting on the company"
          value={c?.waitingCompany ?? 0}
          icon="approval"
          tone={c?.waitingCompany ? 'warning' : 'neutral'}
          loading={!data}
          hint="Countersignatures to approve"
        />
        <StatCard
          label="Signed, last 90 days"
          value={c?.signed90 ?? 0}
          icon="task_alt"
          tone="positive"
          loading={!data}
          hint={
            data?.timeToSign.medianHours != null
              ? `Usually signed in ${hoursText(data.timeToSign.medianHours)}`
              : undefined
          }
        />
        <StatCard
          label="Missing documents"
          value={c?.peopleMissing ?? 0}
          icon="person_alert"
          tone={c?.peopleMissing ? 'danger' : 'neutral'}
          loading={!data}
          hint={
            c?.peopleMissing
              ? `${c.peopleMissing === 1 ? 'Person' : 'People'} without a required one`
              : 'Everyone is covered'
          }
          onClick={() => onShow('people')}
        />
      </div>

      {!data ? (
        <Panel>
          <SkeletonRows rows={4} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              icon="hourglass_top"
              title="Needs chasing"
              description="A week or more without a signature, or due in two days."
            />
            {!data.stuck.length ? (
              <EmptyState
                icon="check_circle"
                title="Nothing stuck"
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {data.stuck.map((x) => (
                  <Row
                    key={x.id}
                    item={x}
                    onOpen={onOpen}
                    sub={`Waiting on ${x.waitingOn.join(', ')}`}
                    right={
                      <Pill
                        tone={
                          x.dueIn !== null && x.dueIn <= 2
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {x.dueIn !== null && x.dueIn <= 2
                          ? x.dueIn <= 0
                            ? 'Due today'
                            : `Due in ${x.dueIn}d`
                          : `${x.days} days`}
                      </Pill>
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              icon="bar_chart"
              title="Signed per week"
              description={
                data.timeToSign.sample
                  ? `Half are signed within ${hoursText(data.timeToSign.medianHours)} of sending (last 90 days).`
                  : 'The last eight weeks.'
              }
            />
            <div className="p-4 pt-8">
              <WeeksChart weeks={data.weeks} />
            </div>
          </Panel>

          {data.waitingCompany.length > 0 && (
            <Panel>
              <PanelHeader
                icon="approval"
                title="Waiting on the company"
                description="The company signer approves these from Home or the email."
              />
              <ul className="divide-y divide-white/[0.05]">
                {data.waitingCompany.map((x) => (
                  <Row
                    key={x.id}
                    item={x}
                    onOpen={onOpen}
                    right={
                      <span className="text-xs text-neutral-500">
                        {x.waitingOn.join(', ')}
                      </span>
                    }
                  />
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <PanelHeader
              icon="event_upcoming"
              title="Ending soon"
              description="Agreements with an end date in the next 60 days."
            />
            {!data.ending.length ? (
              <EmptyState
                icon="event_available"
                title="Nothing ends soon"
                description="Set an end date when sending, or on a signed agreement, to hear 30 and 7 days before."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {data.ending.map((x) => (
                  <Row
                    key={x.id}
                    item={x}
                    onOpen={onOpen}
                    sub={`${x.people.join(', ')} · ends ${day(x.endsOn)}`}
                    right={
                      x.renewed ? (
                        <Pill tone="positive" icon="autorenew">
                          Renewal sent
                        </Pill>
                      ) : (
                        <Pill tone={x.daysLeft <= 7 ? 'danger' : 'warning'}>
                          {x.daysLeft} days
                        </Pill>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>

          {data.requirements.length > 0 && (
            <Panel>
              <PanelHeader
                icon="checklist"
                title="Required documents"
                description="Set in Administration, Required documents."
                actions={
                  <button
                    type="button"
                    onClick={() => onShow('people')}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    People
                  </button>
                }
              />
              <ul className="divide-y divide-white/[0.05]">
                {data.requirements.map((q) => {
                  const total = q.signed + q.waiting + q.missing;
                  return (
                    <li key={q.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-white">{q.label}</span>
                        <span className="text-xs text-neutral-500">
                          {q.signed} of {total} signed
                          {q.missing ? ` · ${q.missing} missing` : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-white/[0.06]">
                        {q.signed > 0 && (
                          <span
                            className="bg-emerald-400/80"
                            style={{
                              width: `${(q.signed / Math.max(1, total)) * 100}%`,
                            }}
                          />
                        )}
                        {q.waiting > 0 && (
                          <span
                            className="bg-amber-400/70"
                            style={{
                              width: `${(q.waiting / Math.max(1, total)) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="flex gap-4 border-t border-white/[0.07] px-4 py-2 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400/80" />
                  Signed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400/70" />
                  Out for signing
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-white/[0.12]" />
                  Missing
                </span>
              </p>
            </Panel>
          )}

          {data.rollouts.length > 0 && (
            <Panel>
              <PanelHeader
                icon="campaign"
                title="Policy rollouts"
                actions={
                  <button
                    type="button"
                    onClick={() => onShow('policies')}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    All rollouts
                  </button>
                }
              />
              <ul className="divide-y divide-white/[0.05]">
                {data.rollouts.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-white">{r.title}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {r.audienceText}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {r.counts.acknowledged} of {r.counts.total}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {data.declined.length > 0 && (
            <Panel>
              <PanelHeader
                icon="block"
                title="Declined lately"
                description="Last 90 days."
              />
              <ul className="divide-y divide-white/[0.05]">
                {data.declined.map((x) => (
                  <Row
                    key={x.id}
                    item={x}
                    onOpen={onOpen}
                    sub={`${x.by ?? 'Someone'}${x.reason ? `: “${x.reason}”` : ''}`}
                  />
                ))}
              </ul>
            </Panel>
          )}

          <Panel className="lg:col-span-2">
            <PanelHeader icon="history" title="Lately" />
            {!data.activity.length ? (
              <EmptyState icon="history" title="Nothing yet" className="py-8" />
            ) : (
              <ol className="divide-y divide-white/[0.05]">
                {data.activity.map((e, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.agreementId, 'portal', null)}
                      className="flex w-full flex-col gap-0.5 px-4 py-2 text-left hover:bg-white/[0.03] sm:flex-row sm:gap-4"
                    >
                      <span className="w-36 shrink-0 text-xs text-neutral-500">
                        {when(e.at)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
                        {e.text}
                        <span className="text-neutral-500"> · {e.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}
      {data && !data.confidentialIncluded && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Icon name="lock" className="text-[14px]" />
          Confidential documents (pay) are left out. Only HR and owners see
          them.
        </p>
      )}
    </div>
  );
};
