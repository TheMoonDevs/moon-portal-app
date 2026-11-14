'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ChatReport, ChatReportStatus } from '@/models/chat';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  ConfirmDialog,
  EmptyState,
  Panel,
  Pill,
  type PillTone,
  Segmented,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';

type Filter = ChatReportStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'To review' },
  { value: 'removed', label: 'Removed' },
  { value: 'dismissed', label: 'Left up' },
  { value: 'all', label: 'All' },
];

const STATUS: Record<ChatReportStatus, { label: string; tone: PillTone }> = {
  open: { label: 'To review', tone: 'warning' },
  removed: { label: 'Removed', tone: 'danger' },
  dismissed: { label: 'Left up', tone: 'neutral' },
};

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

/**
 * Messages people reported from the app's chats. The stores expect each to
 * be answered within a day: remove the message for everyone, or leave it up.
 * Someone who keeps posting abuse can be deactivated in Users.
 */
export const AdminChatReports = () => {
  const [filter, setFilter] = useState<Filter>('open');
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ChatReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/chat/reports?status=${filter}`,
        null,
      );
      setReports(res?.data?.reports ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load reports.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const answer = async (report: ChatReport, action: 'remove' | 'dismiss') => {
    setWorking(report.id);
    try {
      await PortalSdk.postData(`/api/chat/reports/${report.id}`, { action });
      toast.success(
        action === 'remove' ? 'Message removed for everyone' : 'Left up',
      );
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setWorking(null);
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      <Panel>
        {loading ? (
          <SkeletonRows rows={4} className="p-5" />
        ) : !reports.length ? (
          <EmptyState
            icon="flag"
            title={filter === 'open' ? 'Nothing to review' : 'No reports here'}
            description="Reports from the app's chats show here. Each one is answered within a day."
          />
        ) : (
          <ul className="divide-y divide-white/[0.06] auto-light:divide-black/[0.06]">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <Pill tone={STATUS[r.status].tone}>
                    {STATUS[r.status].label}
                  </Pill>
                  <span>{r.chatName}</span>
                  <span>·</span>
                  <span>{when(r.createdAt)}</span>
                </div>
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src={r.sender.avatar}
                    name={r.sender.name}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-200 auto-light:text-neutral-800">
                      {r.sender.name || 'Someone'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-neutral-300 auto-light:bg-black/[0.04] auto-light:text-neutral-700">
                      {r.text || '(no text)'}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Reported by {r.reporter.name || 'someone'}
                      {r.reason ? `: ${r.reason}` : ''}
                    </p>
                    {r.status !== 'open' && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {STATUS[r.status].label}
                        {r.resolvedBy ? ` by ${r.resolvedBy}` : ''}{' '}
                        {when(r.resolvedAt)}
                      </p>
                    )}
                    {r.status === 'open' && r.messageRemoved && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Already deleted by its sender.
                      </p>
                    )}
                  </div>
                </div>
                {r.status === 'open' && (
                  <div className="flex flex-wrap gap-2 sm:pl-11">
                    <AdminButton
                      size="sm"
                      tone="danger"
                      icon="delete"
                      disabled={r.messageRemoved}
                      loading={working === r.id && !!removing}
                      onClick={() => setRemoving(r)}
                    >
                      Remove for everyone
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      icon="check"
                      loading={working === r.id && !removing}
                      onClick={() => answer(r, 'dismiss')}
                    >
                      {r.messageRemoved ? 'Close' : 'Leave it up'}
                    </AdminButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this message?"
        description={`Everyone in the chat will see “This message was deleted” in place of ${
          removing?.sender.name || 'their'
        }’s message.`}
        message="This can’t be undone."
        confirmLabel="Remove"
        loading={!!removing && working === removing.id}
        onConfirm={() => {
          if (removing) void answer(removing, 'remove');
        }}
      />
    </div>
  );
};
