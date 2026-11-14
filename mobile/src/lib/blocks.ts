import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { api, messageOf } from './api';
import { useAuth } from './auth';
import { queryClient } from './query';
import type { ChatPerson } from './types';

/*
 * Blocking and reporting in chat (portal/lib/chat/blocks.ts), which both app
 * stores ask of apps where people write to each other. Someone you block
 * disappears from your chats, groups included, and can't message you; they
 * aren't told. A reported message is hidden for you at once and goes to
 * Portal's admins, who remove it or leave it within a day.
 */

const blockedKey = ['chatBlocked'] as const;

type People = { people: ChatPerson[] };

/** The people the user blocked, newest first. `fresh`: ask the server again on open. */
export function useBlocked({ fresh = false }: { fresh?: boolean } = {}) {
  const { status } = useAuth();
  return useQuery({
    queryKey: blockedKey,
    queryFn: () => api<People>('/api/chat/blocks'),
    enabled: status === 'signedIn',
    staleTime: 60_000,
    refetchOnMount: fresh ? 'always' : true,
  });
}

/** Their ids, to hide their messages the moment they're blocked. */
export function useBlockedIds() {
  const { data } = useBlocked();
  return useMemo(() => new Set((data?.people ?? []).map((p) => p.id)), [data]);
}

function refreshChats(people: ChatPerson[]) {
  queryClient.setQueryData<People>(blockedKey, { people });
  for (const key of ['conversations', 'conversation', 'messages', 'chatSummary'])
    void queryClient.invalidateQueries({ queryKey: [key] });
}

export async function block(personId: string) {
  const res = await api<People>('/api/chat/blocks', { method: 'POST', body: { userId: personId } });
  refreshChats(res.people);
}

export async function unblock(personId: string) {
  const res = await api<People>(`/api/chat/blocks/${personId}`, { method: 'DELETE' });
  refreshChats(res.people);
}

type Someone = { id: string; name?: string | null };

const nameOf = (person: Someone) => person.name || 'this person';

/** "Block Asha?", then blocks. */
export function confirmBlock(person: Someone, onDone?: () => void) {
  Alert.alert(
    `Block ${nameOf(person)}?`,
    'You won’t see their messages in any chat, and they can’t message you. They aren’t told. You can unblock them in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          void block(person.id)
            .then(onDone)
            .catch((e) => Alert.alert('Couldn’t block them', messageOf(e))),
      },
    ],
  );
}

/** "Unblock Asha?", then unblocks. */
export function confirmUnblock(person: Someone, onDone?: () => void) {
  Alert.alert(`Unblock ${nameOf(person)}?`, 'Their messages show again, and you can message each other.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Unblock',
      onPress: () =>
        void unblock(person.id)
          .then(onDone)
          .catch((e) => Alert.alert('Couldn’t unblock them', messageOf(e))),
    },
  ]);
}

/** Why a message is reported, for the admins. */
export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech or threats',
  'Sexual or violent content',
  'Something else',
] as const;

/** Send a report; with `alsoBlock` the sender is blocked too. */
export async function sendReport(messageId: string, reason: string, alsoBlock: boolean) {
  const res = await api<{ reported: boolean; blocked: boolean }>(`/api/chat/messages/${messageId}/report`, {
    method: 'POST',
    body: { reason, block: alsoBlock },
  });
  if (res.blocked) {
    void queryClient.invalidateQueries({ queryKey: blockedKey });
    for (const key of ['conversations', 'conversation', 'messages'])
      void queryClient.invalidateQueries({ queryKey: [key] });
  }
  return res;
}
