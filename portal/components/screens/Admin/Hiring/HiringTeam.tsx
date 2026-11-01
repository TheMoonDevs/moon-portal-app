'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DIGEST_FREQUENCY_LABELS } from '@/lib/hiring/digestFrequency';
import type { HIRING_DIGEST_FREQUENCY } from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  CopyButton,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  SkeletonRows,
  Spin,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { type HiringSectionProps, OPENING_STATUS_META } from './hiringMeta';

interface TeamOpening {
  id: string;
  title: string;
  status: string;
  hiringLeadId: string | null;
  review: number;
  screen: number;
  pastDue: number;
}

interface TeamLead {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  isMember: boolean;
  digest: HIRING_DIGEST_FREQUENCY;
  meetingLink: string | null;
  takingMeetings: boolean;
  openings: number;
  review: number;
  screen: number;
  pastDue: number;
  interviews: number;
}

const Count = ({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone?: string;
}) => (
  <div className="flex flex-col">
    <span
      className={`text-lg font-semibold tabular-nums ${n ? (tone ?? 'text-white') : 'text-neutral-600'}`}
    >
      {n}
    </span>
    <span className="text-[10px] uppercase tracking-wide text-neutral-500">
      {label}
    </span>
  </div>
);

/**
 * Who leads which opening, how much waits on each lead, their digest and
 * meeting link, and a quick way to switch an opening's lead.
 */
export const HiringTeam = ({
  companyId,
  canEdit,
  users,
}: HiringSectionProps) => {
  const [openings, setOpenings] = useState<TeamOpening[]>([]);
  const [leads, setLeads] = useState<TeamLead[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await PortalSdk.getData(
          `/api/hiring/team?companyId=${companyId}`,
          null,
        );
        setOpenings(res?.data?.openings ?? []);
        setLeads(res?.data?.leads ?? []);
        setMemberIds(res?.data?.memberIds ?? []);
      } catch (err) {
        if (!silent) toast.error(errorText(err, 'Could not load the team.'));
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const members = users
    .filter((u) => memberIds.includes(u.id))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  const nameOf = (id: string | null) =>
    (id && users.find((u) => u.id === id)?.name) || null;

  const switchLead = async (opening: TeamOpening, leadId: string) => {
    setSaving(opening.id);
    try {
      await PortalSdk.patchData(`/api/hiring/openings/${opening.id}`, {
        hiringLeadId: leadId || null,
      });
      toast.success(
        leadId
          ? `${nameOf(leadId) ?? 'The new lead'} leads ${opening.title} now`
          : `${opening.title} has no lead now`,
      );
      await load(true);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(null);
    }
  };

  if (loading && !openings.length)
    return (
      <Panel>
        <SkeletonRows rows={4} />
      </Panel>
    );

  const unled = openings.filter((o) => !o.hiringLeadId);

  return (
    <div className="flex flex-col gap-5">
      {leads.length === 0 ? (
        <Panel>
          <EmptyState
            icon="groups"
            title="No hiring leads yet"
            description="Pick a lead for each opening below. Leads get the hiring digest and their meeting link goes in interview emails."
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <Panel key={lead.id} className="flex flex-col gap-4 p-4">
              <div className="flex items-center gap-3">
                <UserAvatar src={lead.avatar} name={lead.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {lead.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    Leads {lead.openings}{' '}
                    {lead.openings === 1 ? 'opening' : 'openings'}
                  </p>
                </div>
                {!lead.isMember && <Pill tone="danger">Left the company</Pill>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Count n={lead.review} label="Review" tone="text-indigo-300" />
                <Count n={lead.screen} label="Screen" tone="text-sky-300" />
                <Count
                  n={lead.pastDue}
                  label="Past due"
                  tone="text-amber-300"
                />
                <Count
                  n={lead.interviews}
                  label="Calls"
                  tone="text-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-neutral-400">
                <span className="flex items-center gap-2">
                  <Icon name="mail" className="text-[15px] text-neutral-500" />
                  Digest: {DIGEST_FREQUENCY_LABELS[lead.digest]}
                </span>
                {lead.meetingLink ? (
                  <span className="flex items-center gap-2">
                    <Icon
                      name="event"
                      className="text-[15px] text-neutral-500"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-300">
                      {lead.meetingLink.replace(/^https?:\/\//, '')}
                    </span>
                    {!lead.takingMeetings && <Pill tone="warning">Off</Pill>}
                    <CopyButton
                      value={lead.meetingLink}
                      label="Copy meeting link"
                    />
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-neutral-500">
                    <Icon name="event_busy" className="text-[15px]" />
                    No booking page yet. It’s made with default hours the first
                    time an interview email uses it.
                  </span>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Panel className="overflow-hidden">
        <PanelHeader
          icon="swap_horiz"
          title="Leads by opening"
          description={
            unled.length
              ? `${unled.length} ${unled.length === 1 ? 'opening has' : 'openings have'} no lead, so nobody gets their digest.`
              : 'Each lead gets the digest for their openings. Leads change their own digest in Settings.'
          }
        />
        <ul className="divide-y divide-white/[0.05]">
          {openings.map((o) => {
            const status = OPENING_STATUS_META[o.status];
            const waiting = o.review + o.screen + o.pastDue;
            return (
              <li
                key={o.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-100">
                    {o.title}
                    <Pill tone={status?.tone}>{status?.label}</Pill>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {waiting
                      ? [
                          o.review && `${o.review} to review`,
                          o.screen && `${o.screen} to screen`,
                          o.pastDue && `${o.pastDue} past due`,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : 'Nothing waiting'}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {saving === o.id && <Spin className="size-4" />}
                  <NativeSelect
                    aria-label={`Lead for ${o.title}`}
                    value={o.hiringLeadId ?? ''}
                    disabled={!canEdit || saving === o.id}
                    onChange={(e) => switchLead(o, e.target.value)}
                    className="h-9 w-56 text-xs"
                  >
                    <option value="">No lead</option>
                    {members.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </NativeSelect>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
};
