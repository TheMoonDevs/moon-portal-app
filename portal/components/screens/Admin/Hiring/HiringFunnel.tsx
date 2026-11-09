'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { OpeningFunnel } from '@/lib/hiring/funnel';
import type { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  CardSkeletons,
  EmptyState,
  Icon,
  Panel,
  Pill,
  ToggleSwitch,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type HiringSectionProps,
  OPENING_STATUS_META,
  STAGE_META,
} from './hiringMeta';

type FunnelOpening = {
  id: string;
  title: string;
  status: JOB_OPENING_STATUS;
  funnel: OpeningFunnel;
};

const days = (n: number | null) =>
  n === null ? '—' : n < 1 ? '<1 day' : `${n} ${n === 1 ? 'day' : 'days'}`;

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-neutral-500">
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums text-neutral-100">
      {value}
    </span>
  </div>
);

const FunnelCard = ({
  opening,
  onOpenStage,
}: {
  opening: FunnelOpening;
  onOpenStage: (stage?: APPLICATION_STAGE) => void;
}) => {
  const { funnel } = opening;
  const status = OPENING_STATUS_META[opening.status];
  const top = Math.max(1, funnel.total);
  const returnRate = funnel.taskSent
    ? `${Math.round((funnel.taskReturned / funnel.taskSent) * 100)}%`
    : '—';
  // The slowest stage people have moved on from, to point at.
  const slowest = funnel.stages
    .filter((s) => s.avgDays !== null)
    .sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0];
  const worstDrop = funnel.stages
    .slice(1)
    .map((s, i) => ({
      stage: s.stage,
      from: funnel.stages[i],
      lost: funnel.stages[i].reached - s.reached,
    }))
    .filter((d) => d.from.reached > 0)
    .sort((a, b) => b.lost - a.lost)[0];
  const rejectedAt = Object.entries(funnel.rejectedAt).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
  );

  return (
    <Panel className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenStage()}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="truncate text-base font-semibold text-white hover:underline">
            {opening.title}
          </span>
          <Pill tone={status?.tone}>{status?.label}</Pill>
        </button>
        <div className="flex flex-wrap gap-6">
          <Stat label="Applied" value={String(funnel.total)} />
          <Stat
            label="Task sent back"
            value={
              funnel.taskSent
                ? `${returnRate} of ${funnel.taskSent}`
                : returnRate
            }
          />
          <Stat label="Days to hire" value={days(funnel.daysToHire)} />
        </div>
      </div>

      {funnel.total === 0 ? (
        <p className="text-sm text-neutral-500">No applicants yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[96px_minmax(0,1fr)_56px_72px] items-center gap-3 px-1 text-[10px] uppercase tracking-wider text-neutral-500 sm:grid-cols-[110px_minmax(0,1fr)_64px_80px_80px]">
            <span>Stage</span>
            <span>Reached</span>
            <span className="text-right">People</span>
            <span className="text-right">Avg time</span>
            <span className="hidden text-right sm:block">There now</span>
          </div>
          {funnel.stages.map((s, i) => {
            const meta = STAGE_META[s.stage];
            const prev = i > 0 ? funnel.stages[i - 1].reached : null;
            const drop =
              prev && prev > 0 ? Math.round((1 - s.reached / prev) * 100) : 0;
            return (
              <button
                key={s.stage}
                type="button"
                onClick={() => onOpenStage(s.stage)}
                title={`Open ${meta.label} in this opening`}
                className="grid grid-cols-[96px_minmax(0,1fr)_56px_72px] items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-white/[0.04] sm:grid-cols-[110px_minmax(0,1fr)_64px_80px_80px]"
              >
                <span className="flex items-center gap-2 truncate text-xs text-neutral-300">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-5 flex-1 overflow-hidden rounded bg-white/[0.04]">
                    <span
                      className="block h-full rounded transition-[width] duration-500"
                      style={{
                        width: `${(s.reached / top) * 100}%`,
                        backgroundColor: meta.color,
                        opacity: 0.75,
                      }}
                    />
                  </span>
                  {i > 0 && drop > 0 && (
                    <span className="hidden w-12 shrink-0 text-right text-[10px] text-rose-300/80 md:inline">
                      −{drop}%
                    </span>
                  )}
                </span>
                <span className="text-right text-xs font-medium tabular-nums text-neutral-100">
                  {s.reached}
                </span>
                <span
                  className={
                    slowest?.stage === s.stage
                      ? 'text-right text-xs tabular-nums text-amber-300'
                      : 'text-right text-xs tabular-nums text-neutral-400'
                  }
                >
                  {days(s.avgDays)}
                </span>
                <span className="hidden text-right text-xs tabular-nums text-neutral-500 sm:block">
                  {s.now || '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {funnel.total > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-3 text-xs text-neutral-400">
          {worstDrop && worstDrop.lost > 0 && (
            <p className="flex items-center gap-2">
              <Icon
                name="trending_down"
                className="text-[16px] text-rose-300"
              />
              Most people stop between {STAGE_META[worstDrop.from.stage].label}{' '}
              and {STAGE_META[worstDrop.stage].label} ({worstDrop.lost} of{' '}
              {worstDrop.from.reached}).
            </p>
          )}
          {slowest && (slowest.avgDays ?? 0) >= 1 && (
            <p className="flex items-center gap-2">
              <Icon
                name="hourglass_bottom"
                className="text-[16px] text-amber-300"
              />
              {STAGE_META[slowest.stage].label} is the slowest stage, at{' '}
              {days(slowest.avgDays)} on average.
            </p>
          )}
          {funnel.rejected > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <Icon name="block" className="text-[16px] text-neutral-500" />
              {funnel.rejected} rejected:
              {rejectedAt.map(([stage, n]) => (
                <span key={stage} className="text-neutral-500">
                  {n} at {STAGE_META[stage as APPLICATION_STAGE]?.label}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};

/**
 * A funnel for each opening: how many people reached each stage, where
 * they dropped off, how long each stage takes, and how many sent the task
 * back. Built from the stage history every application keeps.
 */
export const HiringFunnel = ({
  companyId,
  onOpenOpening,
}: HiringSectionProps & {
  onOpenOpening: (openingId: string, stage?: APPLICATION_STAGE) => void;
}) => {
  const [openings, setOpenings] = useState<FunnelOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/hiring/funnel?companyId=${companyId}${archived ? '&archived=1' : ''}`,
        null,
      );
      setOpenings(res?.data?.openings ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load the funnel.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, archived]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Everyone counts for each stage they reached, even if they skipped one.
          Average time counts people who have moved on.
        </p>
        <ToggleSwitch
          checked={archived}
          onChange={setArchived}
          label="Archived openings"
          className="w-auto shrink-0 py-1.5"
        />
      </div>
      {loading && !openings.length ? (
        <CardSkeletons count={2} />
      ) : openings.length === 0 ? (
        <Panel>
          <EmptyState
            icon="filter_alt"
            title="No openings yet"
            description="Once people apply, each opening's funnel shows here."
          />
        </Panel>
      ) : (
        openings.map((o) => (
          <FunnelCard
            key={o.id}
            opening={o}
            onOpenStage={(stage) => onOpenOpening(o.id, stage)}
          />
        ))
      )}
    </div>
  );
};
