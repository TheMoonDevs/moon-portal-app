'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  QUICK_ACTION_TEMPLATES,
  starterById,
} from '@/lib/hiring/emailTemplates';
import type { QueueItem, QueueKind, QueueOpening } from '@/lib/hiring/queue';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  type PillTone,
  Segmented,
  SkeletonRows,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type ApplicationRow,
  daysSince,
  EMAIL_STATUS_META,
  type HiringSectionProps,
  shortDay,
  STAGE_META,
} from './hiringMeta';

const KIND_META: Record<
  QueueKind,
  { label: string; icon: string; tone: PillTone; empty: string }
> = {
  REVIEW: {
    label: 'Task review',
    icon: 'rate_review',
    tone: 'info',
    empty: 'No tasks waiting for review.',
  },
  PAST_DUE: {
    label: 'Past due',
    icon: 'alarm',
    tone: 'warning',
    empty: 'Nobody is late with their task.',
  },
  BOUNCED: {
    label: 'Email didn’t arrive',
    icon: 'unsubscribe',
    tone: 'danger',
    empty: 'Every email arrived.',
  },
  UNSCREENED: {
    label: 'Unscreened',
    icon: 'inbox',
    tone: 'neutral',
    empty: 'Everyone has been screened.',
  },
};

const KINDS: QueueKind[] = ['REVIEW', 'PAST_DUE', 'BOUNCED', 'UNSCREENED'];

const newSendId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

/** Why the row is in the queue, in a few words. */
const reason = (item: QueueItem) => {
  const a = item.application;
  if (item.kind === 'REVIEW')
    return `Sent their task ${daysSince(item.since)} ago`;
  if (item.kind === 'PAST_DUE')
    return `Task was due ${item.dueAt ? shortDay(item.dueAt) : ''} (${daysSince(item.since)} ago)`;
  if (item.kind === 'BOUNCED') {
    const meta = a.lastEmail ? EMAIL_STATUS_META[a.lastEmail.status] : null;
    return `“${a.lastEmail?.subject}”: ${meta?.label ?? 'not delivered'}`;
  }
  return `Applied ${daysSince(a.submittedAt)} ago`;
};

/**
 * Everything waiting on someone across every opening, with one-click
 * actions: open, extend, remind and send again.
 */
export const HiringQueue = ({
  companyId,
  canEdit,
  openApplicant,
  compose,
}: HiringSectionProps) => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [openings, setOpenings] = useState<QueueOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(3);
  const [kind, setKind] = useState<'ALL' | QueueKind>('ALL');
  const [openingId, setOpeningId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await PortalSdk.getData(
          `/api/hiring/queue?companyId=${companyId}&days=${days}`,
          null,
        );
        setItems(res?.data?.items ?? []);
        setOpenings(res?.data?.openings ?? []);
      } catch (err) {
        if (!silent) toast.error(errorText(err, 'Could not load the queue.'));
      } finally {
        setLoading(false);
      }
    },
    [companyId, days],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openingOf = useMemo(
    () => new Map(openings.map((o) => [o.id, o])),
    [openings],
  );
  const inOpening = items.filter(
    (i) => !openingId || i.application.openingId === openingId,
  );
  const counts = Object.fromEntries(
    KINDS.map((k) => [k, inOpening.filter((i) => i.kind === k).length]),
  ) as Record<QueueKind, number>;
  const visible =
    kind === 'ALL' ? inOpening : inOpening.filter((i) => i.kind === kind);

  /** Emails them that they have 3 more days, straight from the toast. */
  const sendExtended = async (item: QueueItem) => {
    const template = starterById(QUICK_ACTION_TEMPLATES.deadlineExtended);
    const opening = openingOf.get(item.application.openingId);
    if (!template) return;
    const first = item.application.name.split(/\s+/)[0];
    const sending = toast.loading(`Emailing ${first}…`);
    try {
      const res = await PortalSdk.postData('/api/hiring/emails', {
        ids: [item.application.id],
        subject: template.subject,
        body: template.body,
        sendId: newSendId(),
        templateId: QUICK_ACTION_TEMPLATES.deadlineExtended,
        moveTo: null,
        replyToLead: opening?.replyToLead ?? true,
        meetingLinkFrom: null,
      });
      if (res?.data?.failed)
        toast.error(
          res.data.failures?.[0]?.error ?? `Could not email ${first}.`,
          { id: sending },
        );
      else
        toast.success(`Told ${first} about their new due date`, {
          id: sending,
        });
      load(true);
    } catch (err) {
      toast.error(errorText(err, `Could not email ${first}.`), {
        id: sending,
      });
    }
  };

  const extend = async (item: QueueItem) => {
    const key = `${item.kind}:${item.application.id}`;
    setBusy(key);
    try {
      await PortalSdk.patchData(
        `/api/hiring/applications/${item.application.id}`,
        { extendTask: { days: 3 } },
      );
      toast.success(
        `${item.application.name.split(/\s+/)[0]} has 3 more days`,
        {
          description: 'Send them a reminder with the new due date?',
          duration: 12000,
          action: {
            label: 'Send reminder',
            onClick: () => sendExtended(item),
          },
        },
      );
      load(true);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (item: QueueItem) => {
    const email = item.application.lastEmail;
    if (!email) return;
    const key = `${item.kind}:${item.application.id}`;
    setBusy(key);
    try {
      await PortalSdk.postData('/api/hiring/emails/resend', {
        emailId: email.id,
        sendId: newSendId(),
      });
      toast.success('Sent again');
      load(true);
    } catch (err) {
      toast.error(errorText(err, 'Could not send it again.'));
    } finally {
      setBusy(null);
    }
  };

  const remind = (item: QueueItem) => {
    const opening = openingOf.get(item.application.openingId);
    if (!opening) return;
    compose({
      recipients: [item.application as ApplicationRow],
      opening,
      template: 'starter:reminder',
      onSent: () => load(true),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          className="max-w-full overflow-x-auto"
          options={[
            { value: 'ALL', label: 'All', count: inOpening.length },
            ...KINDS.map((k) => ({
              value: k,
              label: KIND_META[k].label,
              icon: KIND_META[k].icon,
              count: counts[k],
            })),
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
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          Unscreened after
          <NativeSelect
            aria-label="Unscreened after"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 w-24 text-xs"
          >
            {[1, 2, 3, 5, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? 'day' : 'days'}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <Panel className="overflow-hidden">
        {loading && !items.length ? (
          <SkeletonRows rows={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Nothing waiting"
            description={
              kind === 'ALL'
                ? 'No tasks to review, nobody late, every email arrived and everyone is screened.'
                : KIND_META[kind].empty
            }
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {visible.map((item) => {
              const a = item.application;
              const meta = KIND_META[item.kind];
              const stage = STAGE_META[a.stage];
              const opening = openingOf.get(a.openingId);
              const key = `${item.kind}:${a.id}`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <span
                    className={cn(
                      'hidden size-9 shrink-0 items-center justify-center rounded-lg text-[18px] sm:flex',
                      item.kind === 'BOUNCED'
                        ? 'bg-rose-500/10 text-rose-300'
                        : item.kind === 'PAST_DUE'
                          ? 'bg-amber-500/10 text-amber-300'
                          : item.kind === 'REVIEW'
                            ? 'bg-indigo-500/10 text-indigo-300'
                            : 'bg-white/[0.06] text-neutral-400',
                    )}
                  >
                    <Icon name={meta.icon} />
                  </span>
                  <button
                    type="button"
                    onClick={() => openApplicant(a, () => load(true))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-100">
                        {a.name}
                      </span>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      {stage && item.kind === 'BOUNCED' && (
                        <Pill tone={stage.tone}>{stage.label}</Pill>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500 sm:truncate">
                      {opening?.title ?? 'An opening'} · {reason(item)}
                    </span>
                  </button>
                  <span className="flex shrink-0 flex-wrap items-center gap-1">
                    <AdminButton
                      size="sm"
                      tone="ghost"
                      className="hidden sm:inline-flex"
                      icon="open_in_new"
                      onClick={() => openApplicant(a, () => load(true))}
                    >
                      Open
                    </AdminButton>
                    {canEdit && item.kind === 'PAST_DUE' && (
                      <>
                        <AdminButton
                          size="sm"
                          icon="more_time"
                          loading={busy === key}
                          onClick={() => extend(item)}
                        >
                          +3 days
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          icon="alarm"
                          onClick={() => remind(item)}
                        >
                          Remind
                        </AdminButton>
                      </>
                    )}
                    {canEdit && item.kind === 'BOUNCED' && (
                      <AdminButton
                        size="sm"
                        icon="forward_to_inbox"
                        loading={busy === key}
                        onClick={() => resend(item)}
                      >
                        Send again
                      </AdminButton>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="text-[11px] text-neutral-600">
        The same list the hiring digest emails each lead, across every opening.
        A bounced address usually needs fixing before sending again.
      </p>
    </div>
  );
};
