'use client';

import { useEffect, useMemo, useState } from 'react';

import { chatApi, type ChatPerson } from './api';
import { Icon, RoundButton, Spin, UserAvatar } from './parts';

let contactsCache: ChatPerson[] | null = null;

/** Loads the people the user can message (cached for the session). */
export function useContacts() {
  const [contacts, setContacts] = useState<ChatPerson[] | null>(contactsCache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    chatApi<{ contacts: ChatPerson[] }>('/api/chat/contacts')
      .then((res) => {
        contactsCache = res.contacts;
        setContacts(res.contacts);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  return { contacts, error };
}

/** Pick someone to message: everyone in a company with the user, A to Z. */
export const NewChatPanel = ({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (person: ChatPerson) => void;
}) => {
  const { contacts, error } = useContacts();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const list = (contacts ?? []).filter(
      (p) =>
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.companies ?? []).some((c) => c.toLowerCase().includes(q)),
    );
    const byLetter = new Map<string, ChatPerson[]>();
    for (const p of list) {
      const letter = (p.name || '#').charAt(0).toUpperCase();
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), p]);
    }
    return Array.from(byLetter.entries());
  }, [contacts, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-2 pb-2 pt-4">
        <RoundButton icon="arrow_back" label="Back" onClick={onBack} />
        <div>
          <h2 className="text-lg font-semibold leading-tight">New chat</h2>
          {contacts && (
            <p className="text-xs text-neutral-500">
              {contacts.length} {contacts.length === 1 ? 'person' : 'people'} in
              your companies
            </p>
          )}
        </div>
      </div>
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
        {contacts && !contacts.length && (
          <p className="px-6 py-12 text-center text-sm text-neutral-500">
            You can message people once you are in a company with them.
          </p>
        )}
        {groups.map(([letter, people]) => (
          <div key={letter}>
            <p className="px-4 pb-1 pt-3 text-xs font-medium text-emerald-400 auto-light:text-emerald-700">
              {letter}
            </p>
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
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
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
