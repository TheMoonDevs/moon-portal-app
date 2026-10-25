'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { Badge } from '@/models/progress';
import { BADGE_METRIC, METRIC_LABELS } from '@/models/progress';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { DEFAULT_BADGE_IMAGE } from '../../Home/BadgeCard';
import {
  AdminButton,
  AdminModal,
  CardSkeletons,
  ConfirmDialog,
  EmptyState,
  Field,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  TextInput,
  ToggleSwitch,
} from '../shared/AdminUI';
import { ImageField } from '../shared/ImageField';
import { errorText } from '../Workspace/shared';

type AdminBadge = Badge & { holderCount?: number };

const METRIC_OPTIONS: { value: BADGE_METRIC; label: string; hint: string }[] = [
  {
    value: BADGE_METRIC.WORKLOG_STREAK,
    label: 'Worklog streak',
    hint: 'Days in a row with a worklog.',
  },
  {
    value: BADGE_METRIC.WORKLOG_DAYS,
    label: 'Days logged',
    hint: 'Total days with a worklog.',
  },
  {
    value: BADGE_METRIC.TASKS_DONE,
    label: 'Tasks done',
    hint: 'Tasks assigned to them that are done.',
  },
  {
    value: BADGE_METRIC.MAJOR_TASKS_DONE,
    label: 'Major tasks done',
    hint: 'Major tasks assigned to them that are done.',
  },
  {
    value: BADGE_METRIC.POINTS,
    label: 'Points',
    hint: 'Points from finished work, across every company.',
  },
  {
    value: BADGE_METRIC.DAYS_ON_PORTAL,
    label: 'Days on the portal',
    hint: 'Days since their account was created.',
  },
];

/** A few ready-made badges so the tab is useful from the first visit. */
const STARTER_BADGES = [
  {
    name: 'First log',
    description: 'Wrote a first worklog.',
    metric: BADGE_METRIC.WORKLOG_DAYS,
    threshold: 1,
  },
  {
    name: 'On a roll',
    description: 'Seven days of worklogs in a row.',
    metric: BADGE_METRIC.WORKLOG_STREAK,
    threshold: 7,
  },
  {
    name: 'Closer',
    description: 'Finished ten tasks.',
    metric: BADGE_METRIC.TASKS_DONE,
    threshold: 10,
  },
  {
    name: 'Heavy lifter',
    description: 'Finished five major tasks.',
    metric: BADGE_METRIC.MAJOR_TASKS_DONE,
    threshold: 5,
  },
  {
    name: 'One year in',
    description: 'A year on the portal.',
    metric: BADGE_METRIC.DAYS_ON_PORTAL,
    threshold: 365,
  },
];

type Draft = {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  metric: BADGE_METRIC;
  threshold: number;
  isActive: boolean;
};

const emptyDraft: Draft = {
  name: '',
  description: '',
  imageUrl: '',
  metric: BADGE_METRIC.WORKLOG_STREAK,
  threshold: 7,
  isActive: true,
};

export const AdminBadges = () => {
  const { canPortal } = useWorkspace();
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminBadge | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData('/api/badges', null);
      setBadges(res?.data?.badges ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load badges.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { id, ...body } = draft;
      if (id) await PortalSdk.patchData(`/api/badges/${id}`, body);
      else await PortalSdk.postData('/api/badges', body);
      toast.success(id ? 'Badge saved' : 'Badge created');
      setDraft(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const addStarters = async () => {
    setSaving(true);
    try {
      for (const badge of STARTER_BADGES) {
        await PortalSdk.postData('/api/badges', badge);
      }
      toast.success('Added five starter badges');
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(`/api/badges/${deleting.id}`, {});
      toast.success('Badge deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const canCreate = canPortal('badges:create');
  const canEdit = canPortal('badges:edit');
  const canDelete = canPortal('badges:delete');
  const metric = METRIC_OPTIONS.find((m) => m.value === draft?.metric);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-neutral-400">
          People earn badges on their own as they work. Nobody has to hand them
          out, and the portal checks whenever someone opens their badges.
        </p>
        {canCreate && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => setDraft({ ...emptyDraft })}
          >
            New badge
          </AdminButton>
        )}
      </div>

      {loading ? (
        <CardSkeletons count={6} />
      ) : badges.length === 0 ? (
        <Panel>
          <EmptyState
            icon="workspace_premium"
            title="No badges yet"
            description="Start with a few ready-made ones, or make your own."
            action={
              canCreate && (
                <AdminButton
                  size="sm"
                  tone="primary"
                  icon="auto_awesome"
                  loading={saving}
                  onClick={addStarters}
                >
                  Add starter badges
                </AdminButton>
              )
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                'group flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4',
                !badge.isActive && 'opacity-60',
              )}
            >
              <div
                className="size-14 shrink-0 overflow-hidden"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={badge.imageUrl || DEFAULT_BADGE_IMAGE}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-100">
                  {badge.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {badge.threshold} {METRIC_LABELS[badge.metric]}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill tone="positive">{badge.holderCount ?? 0} earned</Pill>
                  {!badge.isActive && <Pill>Hidden</Pill>}
                </div>
              </div>
              <div className="flex flex-col gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                {canEdit && (
                  <IconAction
                    icon="edit"
                    label="Edit badge"
                    onClick={() =>
                      setDraft({
                        id: badge.id,
                        name: badge.name,
                        description: badge.description ?? '',
                        imageUrl: badge.imageUrl ?? '',
                        metric: badge.metric,
                        threshold: badge.threshold,
                        isActive: badge.isActive,
                      })
                    }
                  />
                )}
                {canDelete && (
                  <IconAction
                    icon="delete"
                    label="Delete badge"
                    tone="danger"
                    onClick={() => setDeleting(badge)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        icon="workspace_premium"
        title={draft?.id ? 'Edit badge' : 'New badge'}
        footer={
          <>
            <AdminButton tone="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              disabled={!draft?.name.trim() || !(draft?.threshold > 0)}
              onClick={save}
            >
              {draft?.id ? 'Save' : 'Create'}
            </AdminButton>
          </>
        }
      >
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <TextInput
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="On a roll"
              />
            </Field>
            <Field label="Earned for" hint={metric?.hint}>
              <NativeSelect
                value={draft.metric}
                onChange={(e) =>
                  setDraft({ ...draft, metric: e.target.value as BADGE_METRIC })
                }
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Goal"
              hint={`${draft.threshold} ${METRIC_LABELS[draft.metric]}`}
            >
              <TextInput
                type="number"
                min={1}
                value={draft.threshold}
                onChange={(e) =>
                  setDraft({ ...draft, threshold: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <TextInput
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Seven days of worklogs in a row."
              />
            </Field>
            <Field
              label="Image"
              hint="Optional. A square image works best; it is shown as a hexagon."
              className="sm:col-span-2"
            >
              <ImageField
                shape="hex"
                value={draft.imageUrl}
                onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
              />
            </Field>
            <ToggleSwitch
              className="sm:col-span-2"
              checked={draft.isActive}
              onChange={(isActive) => setDraft({ ...draft, isActive })}
              label="Visible"
              description="Hidden badges cannot be earned. People keep any they already have."
            />
          </div>
        )}
      </AdminModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'this badge'}?`}
        message="Everyone who earned it loses it. To stop new people earning it but let others keep it, hide it instead."
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
};
