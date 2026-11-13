import type { ChatPerson } from './types';

/*
 * @mentions in group chats: typing "@" offers the group's members, the
 * picked name goes into the text as "@Full Name", and the message carries the
 * ids of everyone named, who get a push even when the chat is muted
 * (portal/lib/chat/server.ts).
 */

export const nameOf = (p: Pick<ChatPerson, 'name' | 'username'>) => p.name || p.username || '';

/** The "@word" being typed at the end of the text, or null. */
export function mentionQuery(text: string): { start: number; query: string } | null {
  const m = /(^|\s)@([^\s@]{0,30})$/.exec(text);
  if (!m) return null;
  return { start: text.length - m[2].length - 1, query: m[2].toLowerCase() };
}

/** Members whose name (or a word of it) starts with what was typed. */
export function mentionMatches(people: ChatPerson[], query: string, max = 5) {
  return people
    .filter((p) => {
      const name = nameOf(p).toLowerCase();
      return !!name && (name.startsWith(query) || name.split(/\s+/).some((w) => w.startsWith(query)));
    })
    .slice(0, max);
}

/** The ids of the people named with "@Name" in the text. */
export function mentionsIn(text: string, people: ChatPerson[]) {
  return people.filter((p) => nameOf(p) && text.includes(`@${nameOf(p)}`)).map((p) => p.id);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The text cut into plain runs and "@Name" runs, for showing names bold. */
export function splitMentions(text: string, names: string[]) {
  const usable = names.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!usable.length || !text.includes('@')) return [{ text, mention: false }];
  const alternatives = usable.map(escape).join('|');
  const exact = new RegExp(`^@(?:${alternatives})$`);
  return text
    .split(new RegExp(`(@(?:${alternatives}))`))
    .filter(Boolean)
    .map((part) => ({ text: part, mention: exact.test(part) }));
}
