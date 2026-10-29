'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Field,
  Icon,
  TextArea,
  UserAvatar,
} from '../Admin/shared/AdminUI';
import { errorText } from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';
import { ago } from '../Project/types';

export type ProjectRequestRow = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  note?: string | null;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN';
  requestedById: string;
  reviewedById?: string | null;
  reviewNote?: string | null;
  projectId?: string | null;
  createdAt?: string;
  canReview: boolean;
};

export type RequestsData = { requests: ProjectRequestRow[]; users: Person[] };

const STATUS = {
  PENDING: { label: 'Waiting for approval', tone: 'text-amber-200' },
  APPROVED: { label: 'Approved', tone: 'text-emerald-300' },
  DECLINED: { label: 'Not approved', tone: 'text-rose-300' },
  WITHDRAWN: { label: 'Taken back', tone: 'text-neutral-500' },
} as const;

/**
 * Project requests: the ones the person can approve, with Approve and
 * Decline, and their own, with where each stands.
 */
export const ProjectRequests = ({
  data,
  companyName,
  projectName,
  highlight,
  onChanged,
}: {
  data: RequestsData;
  companyName: (id: string) => string;
  projectName: (id: string) => string | undefined;
  /** A request to draw attention to, e.g. opened from a notification. */
  highlight?: string | null;
  onChanged: (created?: string) => void;
}) => {
  const { user } = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<ProjectRequestRow | null>(null);
  const [reason, setReason] = useState('');
  const people = new Map(data.users.map((u) => [u.id, u]));

  // Ones to answer first, then the person's own.
  const rows = [...data.requests].sort(
    (a, b) => Number(b.canReview) - Number(a.canReview),
  );
  if (!rows.length) return null;

  const answer = async (
    request: ProjectRequestRow,
    action: 'approve' | 'decline' | 'withdraw',
    note?: string,
  ) => {
    setBusy(`${request.id}:${action}`);
    try {
      const res = await PortalSdk.patchData(
        `/api/projects/requests/${request.id}`,
        { action, note: note || null },
      );
      toast.success(
        action === 'approve'
          ? `${request.name} created`
          : action === 'decline'
            ? 'Request declined'
            : 'Request taken back',
      );
      setDeclining(null);
      onChanged(res?.data?.project?.id);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const toReview = rows.filter((r) => r.canReview).length;

  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        Requests
        {toReview > 0 && (
          <span className="rounded-full bg-amber-300/15 px-1.5 py-px text-[10px] text-amber-200">
            {toReview} to answer
          </span>
        )}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r) => {
            const by = people.get(r.requestedById);
            const mine = r.requestedById === user?.id;
            const parent = r.parentId ? projectName(r.parentId) : undefined;
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border border-dashed bg-white/[0.015] p-4',
                  highlight === r.id
                    ? 'border-amber-300/60'
                    : 'border-white/[0.12]',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color || '#737373' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {r.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {parent ? (
                        <>
                          <Icon
                            name="subdirectory_arrow_right"
                            className="align-[-2px] text-[13px]"
                          />{' '}
                          Under {parent}
                        </>
                      ) : (
                        companyName(r.companyId)
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-[11px] font-medium',
                      STATUS[r.status].tone,
                    )}
                  >
                    {r.canReview ? 'Needs you' : STATUS[r.status].label}
                  </span>
                </div>

                {(r.note || r.description) && (
                  <p className="line-clamp-3 text-xs text-neutral-400">
                    {r.note || r.description}
                  </p>
                )}
                {r.reviewNote && r.status !== 'PENDING' && (
                  <p className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-neutral-400">
                    {r.reviewNote}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-2">
                  <UserAvatar src={by?.avatar} name={by?.name} size={20} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-500">
                    {mine ? 'You' : (by?.name ?? 'Someone')} ·{' '}
                    {ago(r.createdAt)}
                  </span>
                  {r.canReview ? (
                    <>
                      <AdminButton
                        size="sm"
                        tone="ghost"
                        loading={busy === `${r.id}:decline`}
                        onClick={() => {
                          setReason('');
                          setDeclining(r);
                        }}
                      >
                        Decline
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        tone="primary"
                        icon="check"
                        loading={busy === `${r.id}:approve`}
                        onClick={() => answer(r, 'approve')}
                      >
                        Approve
                      </AdminButton>
                    </>
                  ) : mine && r.status === 'PENDING' ? (
                    <AdminButton
                      size="sm"
                      tone="ghost"
                      loading={busy === `${r.id}:withdraw`}
                      onClick={() => answer(r, 'withdraw')}
                    >
                      Take back
                    </AdminButton>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AdminModal
        open={!!declining}
        onOpenChange={(open) => !open && setDeclining(null)}
        size="sm"
        icon="block"
        title={`Decline ${declining?.name ?? 'request'}?`}
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setDeclining(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="danger"
              size="sm"
              loading={!!busy}
              onClick={() => declining && answer(declining, 'decline', reason)}
            >
              Decline
            </AdminButton>
          </>
        }
      >
        <Field label="Why" hint="Optional. The person who asked sees it.">
          <TextArea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Let's run this inside Music channel for now."
          />
        </Field>
      </AdminModal>
    </section>
  );
};
