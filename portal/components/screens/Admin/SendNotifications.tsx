'use client';

import type { User } from '@db/client';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  EmptyState,
  Field,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
  UserAvatar,
} from './shared/AdminUI';

type Audience = 'ALL' | 'MEMBER' | 'CLIENT';

const TITLE_LIMIT = 80;
const DESCRIPTION_LIMIT = 320;

const SendNotifications = ({
  users,
  loading,
}: {
  users: User[];
  loading: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState<Audience>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const audienceUsers = useMemo(
    () =>
      users.filter((user) =>
        audience === 'ALL' ? true : user.userType === audience,
      ),
    [users, audience],
  );

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? audienceUsers.filter((user) =>
          [user.name, user.username, user.email]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term)),
        )
      : audienceUsers;
    return [...list].sort((a, b) =>
      String(a.name || a.username).localeCompare(String(b.name || b.username)),
    );
  }, [audienceUsers, search]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [users, selectedIds],
  );

  const allVisibleSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every((user) => selectedIds.includes(user.id));

  const toggleUser = (id: string) =>
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );

  const toggleAllVisible = () =>
    setSelectedIds((previous) =>
      allVisibleSelected
        ? previous.filter((id) => !visibleUsers.some((user) => user.id === id))
        : Array.from(
            new Set([...previous, ...visibleUsers.map((user) => user.id)]),
          ),
    );

  const canSend =
    selectedIds.length > 0 && title.trim() !== '' && description.trim() !== '';

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedIds([]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    const results = await Promise.allSettled(
      selectedIds.map((userId) =>
        PortalSdk.postData('/api/notifications/add', {
          userId,
          title: title.trim(),
          description: description.trim(),
          notificationType: 'ADMIN',
          isRead: false,
        }),
      ),
    );
    setSending(false);

    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;
    const sent = results.length - failed;

    if (sent > 0) {
      toast.success(
        `Notification sent to ${sent} ${sent === 1 ? 'user' : 'users'}`,
      );
    }
    if (failed > 0) {
      toast.error(
        `Failed for ${failed} ${failed === 1 ? 'user' : 'users'}. Please retry.`,
      );
    }
    if (failed === 0) resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-5">
      {/* Recipients */}
      <Panel className="flex flex-col overflow-hidden lg:col-span-2">
        <PanelHeader
          title="Recipients"
          description={`${selectedIds.length} selected`}
          icon="group"
          actions={
            selectedIds.length > 0 ? (
              <AdminButton
                size="sm"
                tone="ghost"
                icon="close"
                onClick={() => setSelectedIds([])}
                type="button"
              >
                Clear
              </AdminButton>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4">
          <Segmented<Audience>
            value={audience}
            onChange={setAudience}
            className="w-full"
            options={[
              { value: 'ALL', label: 'Everyone' },
              { value: 'MEMBER', label: 'Members' },
              { value: 'CLIENT', label: 'Clients' },
            ]}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search people…"
          />
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              {visibleUsers.length}{' '}
              {visibleUsers.length === 1 ? 'person' : 'people'}
            </span>
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={visibleUsers.length === 0}
              className="font-medium text-neutral-300 underline-offset-2 hover:underline disabled:opacity-40"
            >
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        <div className="custom-scrollbar max-h-[420px] flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : visibleUsers.length === 0 ? (
            <EmptyState
              icon="person_search"
              title="Nobody found"
              description="Adjust the audience or search term."
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {visibleUsers.map((user) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded border text-[14px] transition-colors',
                          selected
                            ? 'border-white bg-white text-neutral-950'
                            : 'border-white/20 text-transparent',
                        )}
                      >
                        <Icon name="check" />
                      </span>
                      <UserAvatar
                        src={user.avatar}
                        name={user.name}
                        size={30}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-neutral-100">
                          {user.name || user.username}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          @{user.username}
                        </span>
                      </span>
                      <Pill
                        tone={user.userType === 'CLIENT' ? 'info' : 'purple'}
                      >
                        {user.userType}
                      </Pill>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      {/* Compose */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Compose notification"
            description="Delivered to the portal notification centre."
            icon="edit_notifications"
          />
          <div className="flex flex-col gap-4 p-4">
            <Field
              label="Title"
              htmlFor="notification-title"
              required
              hint={`${title.length}/${TITLE_LIMIT} characters`}
            >
              <TextInput
                id="notification-title"
                value={title}
                maxLength={TITLE_LIMIT}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Payouts are processed"
              />
            </Field>

            <Field
              label="Message"
              htmlFor="notification-description"
              required
              hint={`${description.length}/${DESCRIPTION_LIMIT} characters`}
            >
              <TextArea
                id="notification-description"
                value={description}
                maxLength={DESCRIPTION_LIMIT}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Write a short, clear message…"
                className="min-h-[120px]"
              />
            </Field>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.slice(0, 12).map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-0.5 pl-1 pr-2 text-xs text-neutral-200"
                  >
                    <UserAvatar src={user.avatar} name={user.name} size={18} />
                    {user.name || user.username}
                    <button
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className="text-neutral-500 hover:text-neutral-200"
                      aria-label={`Remove ${user.name || user.username}`}
                    >
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </span>
                ))}
                {selectedUsers.length > 12 && (
                  <Pill>+{selectedUsers.length - 12} more</Pill>
                )}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Preview"
            description="How it appears in the notification centre."
            icon="visibility"
          />
          <div className="p-4">
            <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[18px] text-neutral-300">
                <Icon name="campaign" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-100">
                  {title.trim() || 'Notification title'}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-neutral-400">
                  {description.trim() ||
                    'Your message will be shown here exactly as written.'}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-neutral-600">
                  Admin · just now
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            {selectedIds.length === 0
              ? 'Select at least one recipient to send.'
              : `Sending to ${selectedIds.length} ${
                  selectedIds.length === 1 ? 'person' : 'people'
                }.`}
          </p>
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              tone="ghost"
              onClick={resetForm}
              disabled={sending}
            >
              Reset
            </AdminButton>
            <AdminButton
              type="submit"
              tone="primary"
              iconRight="send"
              loading={sending}
              disabled={!canSend}
            >
              Send notification
            </AdminButton>
          </div>
        </div>
      </div>
    </form>
  );
};

export default SendNotifications;
