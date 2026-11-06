'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { CHAT_LIMITS } from '@/models/chat';
import { uploadImage } from '@/utils/helpers/uploads';

import { chatApi, type ChatConversation, type ChatPerson } from './api';
import { useContacts } from './NewChatPanel';
import { Sheet } from './Overlays';
import {
  ChatAvatar,
  Icon,
  ProjectTag,
  RoundButton,
  Spin,
  UserAvatar,
} from './parts';

/* -------------------------------------------------------------------------- */
/*                               Pick people                                  */
/* -------------------------------------------------------------------------- */

/** Search and tick people from the user's companies. */
const PeoplePicker = ({
  picked,
  onToggle,
  excludeIds = [],
}: {
  picked: Map<string, ChatPerson>;
  onToggle: (person: ChatPerson) => void;
  excludeIds?: string[];
}) => {
  const { contacts, error } = useContacts();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const people = useMemo(
    () =>
      (contacts ?? []).filter(
        (p) =>
          !excludeIds.includes(p.id) &&
          (!q ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.username || '').toLowerCase().includes(q) ||
            (p.companies ?? []).some((c) => c.toLowerCase().includes(q))),
      ),
    [contacts, excludeIds, q],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {picked.size > 0 && (
        <div className="quiet-scrollbar flex max-h-28 flex-wrap gap-1.5 overflow-y-auto px-3 pb-2">
          {Array.from(picked.values()).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] py-0.5 pl-0.5 pr-2 text-xs auto-light:bg-black/[0.06]"
            >
              <UserAvatar src={p.avatar} name={p.name} size={22} />
              <span className="max-w-[120px] truncate">{p.name}</span>
              <Icon name="close" className="text-[14px] text-neutral-500" />
            </button>
          ))}
        </div>
      )}
      <div className="px-3 pb-2">
        <label className="flex h-10 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-sm text-neutral-400 auto-light:bg-black/[0.05]">
          <Icon name="search" className="text-[20px]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or companies"
            className="min-w-0 flex-1 bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500 auto-light:text-neutral-900"
          />
        </label>
      </div>
      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto pb-24 md:pb-4">
        {error && <p className="px-4 py-6 text-sm text-rose-400">{error}</p>}
        {!contacts && !error && (
          <div className="flex justify-center gap-2 py-12 text-sm text-neutral-500">
            <Spin /> Loading people…
          </div>
        )}
        {contacts && !people.length && (
          <p className="px-6 py-10 text-center text-sm text-neutral-500">
            {q ? 'Nobody matches.' : 'Everyone you work with is already in.'}
          </p>
        )}
        {people.map((p) => {
          const on = picked.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
            >
              <UserAvatar src={p.avatar} name={p.name} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {[p.positionTitle, (p.companies ?? []).join(', ')]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border text-[15px]',
                  on
                    ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                    : 'border-neutral-600',
                )}
              >
                {on && <Icon name="check" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const usePicked = () => {
  const [picked, setPicked] = useState<Map<string, ChatPerson>>(new Map());
  const toggle = (p: ChatPerson) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(p.id)) next.delete(p.id);
      else if (next.size < CHAT_LIMITS.maxGroupMembers - 1) next.set(p.id, p);
      return next;
    });
  return { picked, toggle, setPicked };
};

/** A round photo picker for a group. */
const GroupPhoto = ({
  value,
  onChange,
  size = 96,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: number;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        style={{ width: size, height: size }}
        aria-label="Group photo"
        className="relative flex items-center justify-center overflow-hidden rounded-full bg-white/[0.07] text-[36px] text-neutral-400 transition-colors hover:bg-white/[0.1] auto-light:bg-black/[0.06]"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <Icon name="add_a_photo" />
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Spin />
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          Remove photo
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setUploading(true);
          try {
            onChange(await uploadImage(file));
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setUploading(false);
          }
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 New group                                  */
/* -------------------------------------------------------------------------- */

/** Start a group: pick people, then give it a name and a photo. */
export const NewGroupPanel = ({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (conversation: ChatConversation) => void;
}) => {
  const { picked, toggle } = usePicked();
  const [step, setStep] = useState<'people' | 'details'>('people');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await chatApi<{ conversation: ChatConversation }>(
        '/api/chat/groups',
        'POST',
        { name, avatar, memberIds: Array.from(picked.keys()) },
      );
      onCreated(res.conversation);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-2 pb-2 pt-4">
        <RoundButton
          icon="arrow_back"
          label="Back"
          onClick={() => (step === 'details' ? setStep('people') : onBack())}
        />
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {step === 'people' ? 'Add group members' : 'New group'}
          </h2>
          <p className="text-xs text-neutral-500">
            {picked.size
              ? `${picked.size} ${picked.size === 1 ? 'person' : 'people'} picked`
              : 'Pick people from your companies'}
          </p>
        </div>
      </div>

      {step === 'people' ? (
        <>
          <PeoplePicker picked={picked} onToggle={toggle} />
          {picked.size > 0 && (
            <button
              type="button"
              aria-label="Next"
              onClick={() => setStep('details')}
              className="absolute bottom-24 right-5 flex size-14 items-center justify-center rounded-full bg-emerald-500 text-[26px] text-neutral-950 shadow-lg hover:bg-emerald-400 md:bottom-6"
            >
              <Icon name="arrow_forward" />
            </button>
          )}
        </>
      ) : (
        <form
          className="flex flex-col items-center gap-5 px-6 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <GroupPhoto value={avatar} onChange={setAvatar} />
          <input
            autoFocus
            value={name}
            maxLength={CHAT_LIMITS.maxGroupNameLength}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="h-11 w-full border-b-2 border-emerald-500/60 bg-transparent text-center text-base outline-none focus:border-emerald-400"
          />
          <div className="flex w-full flex-wrap justify-center gap-1.5">
            {Array.from(picked.values()).map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full bg-white/[0.07] py-0.5 pl-0.5 pr-2 text-xs auto-light:bg-black/[0.06]"
              >
                <UserAvatar src={p.avatar} name={p.name} size={20} />
                {p.name}
              </span>
            ))}
          </div>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="flex h-11 items-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? <Spin /> : <Icon name="check" />} Create group
          </button>
        </form>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 Group info                                 */
/* -------------------------------------------------------------------------- */

/**
 * A group's details: photo, name and members. Admins rename it, change its
 * photo and add or remove people. A project group shows its project's team,
 * which nobody can change here.
 */
export const GroupInfoSheet = ({
  conversation,
  me,
  open,
  onClose,
  onChanged,
  onLeft,
  onMessage,
}: {
  conversation: ChatConversation;
  me: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: (conversation: ChatConversation) => void;
  onLeft: () => void;
  onMessage: (person: ChatPerson) => void;
}) => {
  const group = conversation.group;
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? '');
  const [busy, setBusy] = useState(false);
  const { picked, toggle, setPicked } = usePicked();
  if (!group) return null;
  const isProject = conversation.kind === 'project';
  const base = `/api/chat/groups/${conversation.id}`;

  const run = async (fn: () => Promise<ChatConversation | null>) => {
    setBusy(true);
    try {
      const next = await fn();
      if (next) onChanged(next);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const patch = (body: Record<string, unknown>) =>
    run(() =>
      chatApi<{ conversation: ChatConversation }>(base, 'PATCH', body).then(
        (r) => r.conversation,
      ),
    );

  const addPicked = async () => {
    const ok = await run(() =>
      chatApi<{ conversation: ChatConversation }>(`${base}/members`, 'POST', {
        userIds: Array.from(picked.keys()),
      }).then((r) => r.conversation),
    );
    if (ok) {
      setAdding(false);
      setPicked(new Map());
    }
  };

  const remove = (person: ChatPerson) => {
    if (!window.confirm(`Remove ${person.name} from “${group.name}”?`)) return;
    run(() =>
      chatApi<{ conversation: ChatConversation }>(
        `${base}/members?user=${encodeURIComponent(person.id)}`,
        'DELETE',
      ).then((r) => r.conversation),
    );
  };

  const makeAdmin = (person: ChatPerson) =>
    run(() =>
      chatApi<{ conversation: ChatConversation }>(`${base}/members`, 'PATCH', {
        userId: person.id,
      }).then((r) => r.conversation),
    );

  const leave = async () => {
    if (!window.confirm(`Leave “${group.name}”?`)) return;
    const ok = await run(() =>
      chatApi(
        `${base}/members?user=${encodeURIComponent(me ?? '')}`,
        'DELETE',
      ).then(() => null),
    );
    if (ok) onLeft();
  };

  if (adding)
    return (
      <Sheet
        open={open}
        onClose={() => setAdding(false)}
        title="Add people"
        className="h-[85dvh]"
      >
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <PeoplePicker
            picked={picked}
            onToggle={toggle}
            excludeIds={group.members.map((m) => m.id)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 auto-light:border-black/[0.07]">
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-sm text-neutral-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!picked.size || busy}
            onClick={addPicked}
            className="flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-neutral-950 disabled:opacity-40"
          >
            {busy ? <Spin /> : <Icon name="person_add" />} Add{' '}
            {picked.size || ''}
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isProject ? 'Project group' : 'Group info'}
    >
      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-5 text-center">
          {group.canManage ? (
            <GroupPhoto
              value={group.avatar}
              onChange={(avatar) => patch({ avatar: avatar ?? '' })}
            />
          ) : (
            <ChatAvatar conversation={conversation} size={96} />
          )}
          {renaming ? (
            <form
              className="flex w-full items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await patch({ name })) setRenaming(false);
              }}
            >
              <input
                autoFocus
                value={name}
                maxLength={CHAT_LIMITS.maxGroupNameLength}
                onChange={(e) => setName(e.target.value)}
                className="h-10 min-w-0 flex-1 border-b-2 border-emerald-500/60 bg-transparent text-center outline-none"
              />
              <RoundButton
                icon="check"
                label="Save name"
                onClick={async () => {
                  if (await patch({ name })) setRenaming(false);
                }}
              />
            </form>
          ) : (
            <p className="flex items-center gap-1.5 text-lg font-semibold">
              {group.name}
              {group.canManage && (
                <button
                  type="button"
                  aria-label="Rename group"
                  onClick={() => {
                    setName(group.name);
                    setRenaming(true);
                  }}
                  className="text-[18px] text-neutral-500 hover:text-neutral-200"
                >
                  <Icon name="edit" />
                </button>
              )}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            {isProject && <ProjectTag />}
            {isProject && group.companyName ? `${group.companyName} · ` : ''}
            {group.members.length}{' '}
            {group.members.length === 1 ? 'member' : 'members'}
          </p>
          {isProject && (
            <div className="mt-2 flex w-full flex-col gap-2 rounded-xl bg-sky-500/10 p-3 text-left text-xs text-sky-100/80 auto-light:bg-sky-50 auto-light:text-sky-900">
              <p className="flex gap-2">
                <Icon name="lock" className="text-[15px]" />
                Everyone on the project's team is in this group, and anyone who
                joins the team sees the whole history. Its name and photo are
                the project's.
              </p>
              {group.projectId && (
                <Link
                  href={`/projects/${group.projectId}`}
                  className="self-start font-medium text-sky-300 underline-offset-2 hover:underline auto-light:text-sky-700"
                >
                  Open the project
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] py-2 auto-light:border-black/[0.06]">
          <p className="px-4 pb-1 pt-2 text-xs font-medium text-neutral-500">
            {group.members.length} members
          </p>
          {group.canManage && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-[22px] text-neutral-950">
                <Icon name="person_add" />
              </span>
              Add people
            </button>
          )}
          {group.members.map((p) => {
            const admin = group.adminIds.includes(p.id);
            const self = p.id === me;
            return (
              <div
                key={p.id}
                className="group/member flex items-center gap-3 px-4 py-2"
              >
                <UserAvatar src={p.avatar} name={p.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {self ? 'You' : p.name}
                  </span>
                  {p.positionTitle && (
                    <span className="block truncate text-xs text-neutral-500">
                      {p.positionTitle}
                    </span>
                  )}
                </span>
                {admin && (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 auto-light:text-emerald-700">
                    Admin
                  </span>
                )}
                {!self && (
                  <span className="flex items-center">
                    <RoundButton
                      icon="chat"
                      label={`Message ${p.name}`}
                      onClick={() => onMessage(p)}
                      className="size-8 text-[18px]"
                    />
                    {group.canManage && !admin && (
                      <RoundButton
                        icon="shield_person"
                        label="Make admin"
                        disabled={busy}
                        onClick={() => makeAdmin(p)}
                        className="size-8 text-[18px]"
                      />
                    )}
                    {group.canManage && (
                      <RoundButton
                        icon="person_remove"
                        label="Remove"
                        disabled={busy}
                        onClick={() => remove(p)}
                        className="size-8 text-[18px] hover:text-rose-300"
                      />
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!isProject && (
          <div className="border-t border-white/[0.06] p-2 auto-light:border-black/[0.06]">
            <button
              type="button"
              disabled={busy}
              onClick={leave}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 auto-light:text-rose-600"
            >
              <Icon name="logout" className="text-[20px]" /> Leave group
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
};
