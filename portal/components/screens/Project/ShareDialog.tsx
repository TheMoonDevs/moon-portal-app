'use client';

import type { ItemSharing } from '@db/client';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import {
  AdminButton,
  AdminModal,
  Icon,
  SearchInput,
  UserAvatar,
} from '../Admin/shared/AdminUI';

export type SharePerson = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

export type ShareChange = { restricted: boolean; userIds: string[] };

/**
 * The Share button for a page or a plan. Shows a lock once it is restricted.
 * People who cannot change sharing see only the lock.
 */
export const ShareButton = ({
  sharing,
  canShare,
  onClick,
  className,
}: {
  sharing?: ItemSharing | null;
  canShare: boolean;
  onClick: () => void;
  className?: string;
}) => {
  const restricted = !!sharing?.restricted;
  if (!canShare)
    return restricted ? (
      <span
        title="Only the people it is shared with can open this"
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-amber-200/80',
          className,
        )}
      >
        <Icon name="lock" className="text-[15px]" />
        <span className="hidden sm:inline">Restricted</span>
      </span>
    ) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        restricted
          ? 'Restricted: only the people it is shared with can open it'
          : 'Share: choose who can open it'
      }
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
        restricted
          ? 'bg-amber-400/10 text-amber-200 hover:bg-amber-400/15'
          : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white',
        className,
      )}
    >
      <Icon name={restricted ? 'lock' : 'share'} className="text-[16px]" />
      Share
    </button>
  );
};

const AccessOption = ({
  active,
  icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: string;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    className={cn(
      'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
      active
        ? 'border-white/25 bg-white/[0.06]'
        : 'border-white/[0.07] hover:border-white/15 hover:bg-white/[0.03]',
      disabled && 'pointer-events-none opacity-60',
    )}
  >
    <span
      className={cn(
        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-[18px]',
        active ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-neutral-400',
      )}
    >
      <Icon name={icon} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-neutral-100">
        {title}
      </span>
      <span className="block text-xs leading-relaxed text-neutral-500">
        {hint}
      </span>
    </span>
    <span
      className={cn(
        'mt-2 flex size-4 shrink-0 items-center justify-center rounded-full border',
        active ? 'border-sky-300 bg-sky-300' : 'border-white/25',
      )}
    >
      {active && <span className="size-1.5 rounded-full bg-neutral-950" />}
    </span>
  </button>
);

/**
 * Who can open a page or a plan. By default everyone who can open its
 * project (or company); restricted, only the people picked here, plus its
 * creator or owner. A page inside a restricted page is limited by it too.
 */
export const ShareDialog = ({
  open,
  onOpenChange,
  itemLabel,
  title,
  everyoneTitle,
  everyoneHint,
  sharing,
  people,
  keepers,
  meId,
  limitedBy,
  insideNote,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "page" or "plan". */
  itemLabel: string;
  title: string;
  /** e.g. "Everyone on PORTAL". */
  everyoneTitle: string;
  everyoneHint: string;
  sharing?: ItemSharing | null;
  /** Who it can be shared with: the company's people. */
  people: SharePerson[];
  /** People who always keep access, with why ("Created it", "Owner"). */
  keepers: { id: string; reason: string }[];
  meId?: string | null;
  /** A restricted page above this one, which limits it too. */
  limitedBy?: { title: string; emoji?: string | null; onOpen: () => void };
  /** Said under the options, e.g. that pages inside follow this one. */
  insideNote?: string;
  onSave: (change: ShareChange) => Promise<boolean>;
}) => {
  const [restricted, setRestricted] = useState(!!sharing?.restricted);
  const [ids, setIds] = useState<string[]>(sharing?.userIds ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Start again from what is stored each time it opens.
  useEffect(() => {
    if (!open) return;
    setRestricted(!!sharing?.restricted);
    const start = new Set(sharing?.userIds ?? []);
    // Restricting for the first time starts with the person sharing.
    if (!sharing?.restricted && !start.size && meId) start.add(meId);
    setIds(Array.from(start));
    setSearch('');
  }, [open, sharing, meId]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const keeperReason = useMemo(
    () => new Map(keepers.map((k) => [k.id, k.reason])),
    [keepers],
  );
  const withAccess = useMemo(() => {
    const list = Array.from(new Set([...keepers.map((k) => k.id), ...ids]));
    return list.map(
      (id) =>
        byId.get(id) ?? { id, name: 'Someone', email: null, avatar: null },
    );
  }, [ids, keepers, byId]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(withAccess.map((p) => p.id));
    return people
      .filter(
        (p) =>
          !taken.has(p.id) &&
          (p.name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [search, people, withAccess]);

  const add = (id: string) => {
    setIds((v) => (v.includes(id) ? v : [...v, id]));
    setSearch('');
  };
  const remove = (id: string) => setIds((v) => v.filter((x) => x !== id));

  const save = async () => {
    setSaving(true);
    const done = await onSave({ restricted, userIds: ids });
    setSaving(false);
    if (done) onOpenChange(false);
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      icon={restricted ? 'lock' : 'share'}
      title={`Share ${title}`}
      description={`Choose who can open this ${itemLabel}.`}
      size="sm"
      footer={
        <>
          <AdminButton tone="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </AdminButton>
          <AdminButton tone="primary" loading={saving} onClick={save}>
            Save
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {limitedBy && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
            <Icon name="lock" className="mt-0.5 text-[15px] text-amber-200" />
            <span className="min-w-0 flex-1">
              It sits inside{' '}
              <button
                type="button"
                onClick={limitedBy.onOpen}
                className="font-medium text-amber-100 underline decoration-amber-200/40 underline-offset-2 hover:decoration-amber-100"
              >
                {limitedBy.emoji ? `${limitedBy.emoji} ` : ''}
                {limitedBy.title}
              </button>
              , which is restricted. Only people who can open that page can open
              this one, whatever is set here.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            General access
          </p>
          <AccessOption
            active={!restricted}
            icon="groups"
            title={everyoneTitle}
            hint={everyoneHint}
            onClick={() => setRestricted(false)}
          />
          <AccessOption
            active={restricted}
            icon="lock"
            title="Only people invited"
            hint={`Only the people below can open this ${itemLabel}.`}
            onClick={() => setRestricted(true)}
          />
          {insideNote && (
            <p className="px-1 text-[11px] leading-relaxed text-neutral-500">
              {insideNote}
            </p>
          )}
        </div>

        {restricted && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              People with access
            </p>
            <div className="relative">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Add people by name or email…"
              />
              {matches.length > 0 && (
                <div className="absolute inset-x-0 top-11 z-10 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => add(p.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.06]"
                    >
                      <UserAvatar src={p.avatar} name={p.name} size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-neutral-200">
                          {p.name || 'Unnamed'}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-500">
                          {p.email}
                        </span>
                      </span>
                      <Icon
                        name="person_add"
                        className="text-[17px] text-neutral-500"
                      />
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && !matches.length && (
                <p className="mt-1.5 px-1 text-[11px] text-neutral-500">
                  Nobody else in the company matches that.
                </p>
              )}
            </div>
            <ul className="flex flex-col">
              {withAccess.map((p) => {
                const reason = keeperReason.get(p.id);
                const isMe = p.id === meId;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-1 py-1.5"
                  >
                    <UserAvatar src={p.avatar} name={p.name} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-200">
                        {p.name || 'Unnamed'}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-neutral-500">
                            (you)
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-neutral-500">
                        {reason ?? p.email}
                      </span>
                    </span>
                    {reason ? (
                      <span className="text-[11px] text-neutral-600">
                        Always
                      </span>
                    ) : isMe ? (
                      <span className="text-[11px] text-neutral-600">
                        Stays while you share
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        aria-label={`Remove ${p.name || 'them'}`}
                        title="Remove access"
                        className="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-rose-300"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="px-1 text-[11px] leading-relaxed text-neutral-500">
              Company owners can always open it, so nothing gets lost.
            </p>
          </div>
        )}
      </div>
    </AdminModal>
  );
};
