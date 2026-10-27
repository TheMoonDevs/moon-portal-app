/**
 * Links in applicant answers. Candidates type several links in one box,
 * separated by spaces, commas or new lines, sometimes without https://
 * ("linkedin.com/in/name"), and imported answers mix links into prose.
 */

/** A full link, a www. link, or a bare domain followed by a path. */
const LINK_PATTERN =
  /(?:https?:\/\/|www\.)[^\s,;<>"]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s,;<>"]*/gi;

/** Separators allowed between links when an answer is only links. */
const SEPARATOR = /^[\s,;|]*$/;

/** Punctuation that ends a sentence rather than a link. */
const TRAILING = /[.,;:!?)\]}'"*]+$/;

const count = (text: string, char: string) => text.split(char).length - 1;

/** Adds https:// to a link typed without it. */
export const toHref = (link: string) =>
  /^https?:\/\//i.test(link) ? link : `https://${link}`;

export const isValidLink = (value: string) => {
  try {
    const url = new URL(toHref(value));
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
};

export type TextPart = { text: string; href?: string };

/** Splits text into plain parts and link parts, in order. */
export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of Array.from(text.matchAll(LINK_PATTERN))) {
    const start = match.index ?? 0;
    let link = match[0];
    while (TRAILING.test(link)) {
      // Keep a closing bracket the link itself opened, as in Wikipedia links.
      if (link.endsWith(')') && count(link, '(') >= count(link, ')')) break;
      link = link.slice(0, -1);
    }
    if (!isValidLink(link)) continue;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: link, href: toHref(link) });
    last = start + link.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * The links in an answer that holds nothing but links (one or more,
 * separated by spaces, commas or new lines), or null when it holds
 * other text too.
 */
export function onlyLinks(text: string): string[] | null {
  const parts = linkParts(text);
  const links = parts.filter((p) => p.href).map((p) => p.href!);
  if (!links.length) return null;
  if (parts.some((p) => !p.href && !SEPARATOR.test(p.text))) return null;
  return Array.from(new Set(links));
}

/** Splits a typed list of links on spaces, commas, semicolons and new lines. */
export const splitLinkList = (text: string) =>
  text.split(/[\s,;|]+/).filter(Boolean);
