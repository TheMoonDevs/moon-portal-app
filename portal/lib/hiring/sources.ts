/**
 * Where applicants come from: the apply link's `?ref=` tag, and the share
 * kit's ready-made posts that carry one. Client-safe.
 */

/** A source tag as stored: lower-case letters, digits and dashes. */
export const normalizeSource = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const tag = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return tag || null;
};

/** How applicants with no tag are shown. */
export const DIRECT_SOURCE = 'direct';

export const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct link',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  twitter: 'X / Twitter',
  x: 'X / Twitter',
  facebook: 'Facebook',
  referral: 'Referral',
  email: 'Email',
  import: 'Imported',
  pool: 'Talent pool',
};

export const sourceLabel = (source?: string | null) => {
  const key = source || DIRECT_SOURCE;
  return (
    SOURCE_LABELS[key] ??
    key.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
  );
};

/** The apply link with a source tag. */
export const taggedApplyUrl = (base: string, source: string) =>
  `${base}?ref=${encodeURIComponent(source)}`;

export interface ShareChannel {
  key: 'linkedin' | 'instagram' | 'whatsapp';
  label: string;
  icon: string;
  /** Opens the channel's own share screen, when it has one. */
  shareUrl?: (link: string, text: string) => string;
  /** Where the link goes in the post. */
  linkNote?: string;
}

export const SHARE_CHANNELS: ShareChannel[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'work',
    shareUrl: (link) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: 'photo_camera',
    linkNote:
      'Instagram captions don’t make links clickable. Put the link in your bio or a story link sticker.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: 'chat',
    shareUrl: (_link, text) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
];

type ShareOpening = {
  title: string;
  description?: string | null;
  location?: string | null;
  employmentType?: string | null;
  department?: string | null;
};

const firstSentences = (text: string | null | undefined, max = 240) => {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
};

/** A ready-made post for one channel, with that channel's tagged link. */
export function sharePost(
  channel: ShareChannel['key'],
  opening: ShareOpening,
  company: string,
  link: string,
): string {
  const facts = [opening.employmentType, opening.location]
    .filter(Boolean)
    .join(' · ');
  const summary = firstSentences(opening.description);
  const tag = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '');
  if (channel === 'linkedin')
    return [
      `We're hiring: ${opening.title} at ${company}${facts ? ` (${facts})` : ''}.`,
      summary,
      `If this sounds like you, or someone you know, apply here: ${link}`,
      [
        '#hiring',
        `#${tag(opening.title)}`,
        opening.department && `#${tag(opening.department)}`,
      ]
        .filter(Boolean)
        .join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');
  if (channel === 'instagram')
    return [
      `${company} is hiring ✨ ${opening.title}`,
      facts,
      summary,
      'Apply through the link in our bio.',
      ['#hiring', '#jobs', `#${tag(opening.title)}`].join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');
  return [
    `*${company} is hiring: ${opening.title}*${facts ? `\n${facts}` : ''}`,
    summary,
    `Apply here: ${link}`,
    'Please share with anyone who might be interested 🙏',
  ]
    .filter(Boolean)
    .join('\n\n');
}
