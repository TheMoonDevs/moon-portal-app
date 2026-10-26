'use client';

import type { ProjectResult } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  formatMetric,
  metricLabel,
  metricsWithData,
  RESULT_METRICS,
  toDay,
} from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  DateInput,
  EmptyState,
  Field,
  formatDate,
  IconAction,
  NativeSelect,
  Panel,
  PanelHeader,
  Segmented,
  SkeletonRows,
  TextInput,
} from '../shared/AdminUI';
import type { ProjectRow } from './AdminProjects';
import { CompanyMark, errorText } from './shared';

const CUSTOM = '__custom';

/** Record and review a project's results (earnings, subscribers, …). */
export const ProjectResults = ({
  project,
  canEdit,
  onOpenChange,
  onSaved,
}: {
  project: ProjectRow | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [results, setResults] = useState<ProjectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState('subscribers');
  const [custom, setCustom] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(toDay());
  const [saving, setSaving] = useState(false);

  const projectId = project?.id;
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/results?projectId=${projectId}`,
        null,
      );
      setResults(res?.data?.results ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load results.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setResults([]);
    setValue('');
    setDate(toDay());
    load();
  }, [load]);

  const save = async () => {
    if (!project) return;
    const key = metric === CUSTOM ? custom.trim() : metric;
    if (!key) return toast.error('Name what you are measuring.');
    if (value.trim() === '' || !Number.isFinite(Number(value)))
      return toast.error('Enter a number.');
    setSaving(true);
    try {
      await PortalSdk.postData('/api/results', {
        projectId: project.id,
        metric: key,
        value: Number(value),
        date,
      });
      toast.success('Result recorded');
      setValue('');
      await load();
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await PortalSdk.deleteData(`/api/results/${id}`, {});
      await load();
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const customKeys = metricsWithData(results).filter(
    (k) => !RESULT_METRICS.some((m) => m.key === k),
  );

  return (
    <AdminModal
      open={!!project}
      onOpenChange={onOpenChange}
      size="lg"
      icon="insights"
      title={`${project?.name ?? 'Project'} results`}
      description="Record readings like earnings or subscribers. Projects are ranked on their latest reading."
    >
      <div className="flex flex-col gap-5">
        {(project?.standings?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {project!.standings.map((s) => (
              <div
                key={s.metric}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2"
              >
                <p className="text-xs text-neutral-500">
                  {metricLabel(s.metric)}
                </p>
                <p className="text-sm font-semibold text-white">
                  {formatMetric(s.metric, s.value)}
                  <span className="ml-2 text-xs font-normal text-neutral-400">
                    #{s.rank} of {s.of}
                  </span>
                </p>
                {s.change !== null && (
                  <p
                    className={cn(
                      'text-xs',
                      s.change >= 0 ? 'text-emerald-400' : 'text-rose-400',
                    )}
                  >
                    {s.change >= 0 ? '+' : ''}
                    {formatMetric(s.metric, s.change)} in 30 days
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 [&>*]:min-w-[130px] [&>*]:flex-1">
            <Field label="Measure">
              <NativeSelect
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                {RESULT_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
                {customKeys.map((k) => (
                  <option key={k} value={k}>
                    {metricLabel(k)}
                  </option>
                ))}
                <option value={CUSTOM}>Something else…</option>
              </NativeSelect>
            </Field>
            {metric === CUSTOM && (
              <Field label="Name">
                <TextInput
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Downloads"
                />
              </Field>
            )}
            <Field label="Date">
              <DateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Value">
              <TextInput
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder="1200"
              />
            </Field>
            <AdminButton tone="primary" loading={saving} onClick={save}>
              Record
            </AdminButton>
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={3} />
        ) : results.length === 0 ? (
          <EmptyState
            icon="insights"
            title="No results yet"
            description="Record the first reading to put this project on the ranking."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
            {results.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-24 text-xs text-neutral-500">
                  {formatDate(r.date)}
                </span>
                <span className="flex-1 text-sm text-neutral-300">
                  {metricLabel(r.metric)}
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatMetric(r.metric, r.value)}
                </span>
                {canEdit && (
                  <IconAction
                    icon="close"
                    label="Delete reading"
                    onClick={() => remove(r.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminModal>
  );
};

/** Projects of a company ranked on one result at a time. */
export const ProjectRanking = ({
  projects,
  onOpen,
}: {
  projects: ProjectRow[];
  onOpen: (project: ProjectRow) => void;
}) => {
  const metrics = useMemo(
    () =>
      metricsWithData(
        projects.flatMap((p) => (p.standings ?? []).map((s) => s)),
      ),
    [projects],
  );
  const [metric, setMetric] = useState<string>('');
  const active = metrics.includes(metric) ? metric : metrics[0];
  if (!active) return null;

  const rows = projects
    .map((p) => ({
      project: p,
      standing: p.standings?.find((s) => s.metric === active),
    }))
    .filter((r) => r.standing)
    .sort((a, b) => a.standing!.rank - b.standing!.rank);

  return (
    <Panel>
      <PanelHeader
        icon="leaderboard"
        title="Ranking"
        description="By each project's latest result"
        actions={
          metrics.length > 1 && (
            <Segmented
              value={active}
              onChange={setMetric}
              options={metrics.map((m) => ({
                value: m,
                label: metricLabel(m),
              }))}
            />
          )
        }
      />
      <ol className="divide-y divide-white/[0.05]">
        {rows.map(({ project, standing }) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => onOpen(project)}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.02]"
            >
              <span className="w-6 text-sm font-semibold text-neutral-500">
                {standing!.rank}
              </span>
              <CompanyMark
                name={project.name}
                color={project.color}
                logo={project.logo}
                size={28}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
                {project.name}
              </span>
              {standing!.change !== null && (
                <span
                  className={cn(
                    'text-xs',
                    standing!.change >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400',
                  )}
                >
                  {standing!.change >= 0 ? '+' : ''}
                  {formatMetric(active, standing!.change)}
                </span>
              )}
              <span className="w-20 text-right text-sm font-semibold text-white">
                {formatMetric(active, standing!.value)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Panel>
  );
};
