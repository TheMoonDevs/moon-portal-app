/*
 * How someone's little character in the World looks. Every part is a
 * name from a short list, so the Settings page and Claude (through the
 * MCP tools) choose from the same things.
 */

export const LOOK_OPTIONS = {
  skin: ['porcelain', 'peach', 'tan', 'olive', 'brown', 'deep'],
  hair: [
    'short',
    'bob',
    'bun',
    'long',
    'curly',
    'spiky',
    'pigtails',
    'mohawk',
    'bald',
  ],
  hairColor: [
    'black',
    'brown',
    'chestnut',
    'ginger',
    'blonde',
    'silver',
    'pink',
    'blue',
    'purple',
    'mint',
  ],
  eyes: ['dots', 'big', 'happy', 'sleepy', 'wink'],
  cheeks: ['rosy', 'freckles', 'none'],
  glasses: ['none', 'round', 'square', 'shades', 'hearts'],
  hat: [
    'none',
    'cap',
    'beanie',
    'party hat',
    'crown',
    'headphones',
    'flower',
    'cat ears',
    'bunny ears',
    'halo',
  ],
  outfit: ['tee', 'hoodie', 'overalls', 'suit', 'dress'],
  outfitColor: [
    'brand',
    'white',
    'black',
    'red',
    'orange',
    'yellow',
    'green',
    'teal',
    'blue',
    'purple',
    'pink',
  ],
  extra: ['none', 'backpack', 'scarf', 'cape', 'wings', 'balloon'],
  pet: ['none', 'cat', 'dog', 'bunny', 'chick'],
} as const;

export type LookPart = keyof typeof LOOK_OPTIONS;
export type Look = { [K in LookPart]: (typeof LOOK_OPTIONS)[K][number] };

export const LOOK_PARTS = Object.keys(LOOK_OPTIONS) as LookPart[];

export const LOOK_LABELS: Record<LookPart, string> = {
  skin: 'Skin',
  hair: 'Hair',
  hairColor: 'Hair colour',
  eyes: 'Eyes',
  cheeks: 'Cheeks',
  glasses: 'Glasses',
  hat: 'On the head',
  outfit: 'Outfit',
  outfitColor: 'Outfit colour',
  extra: 'Extra',
  pet: 'Pet',
};

export const SKIN_HEX: Record<Look['skin'], string> = {
  porcelain: '#fbe3d0',
  peach: '#f3cfae',
  tan: '#dca77f',
  olive: '#c19a6b',
  brown: '#94603f',
  deep: '#6b4429',
};

export const HAIR_HEX: Record<Look['hairColor'], string> = {
  black: '#24201c',
  brown: '#4a3326',
  chestnut: '#7a4b2a',
  ginger: '#c8642c',
  blonde: '#e3b862',
  silver: '#c9ccd3',
  pink: '#f49ac1',
  blue: '#6ea8fe',
  purple: '#a78bfa',
  mint: '#7dd8b5',
};

/** Outfit colours; `brand` is the company's own colour. */
export const OUTFIT_HEX: Record<
  Exclude<Look['outfitColor'], 'brand'>,
  string
> = {
  white: '#f8fafc',
  black: '#27272a',
  red: '#ef4444',
  orange: '#fb923c',
  yellow: '#facc15',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#f472b6',
};

const hash = (s: string) =>
  Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

/** The look someone has before they choose one: picked from their id. */
export function defaultLook(id: string): Look {
  const h = hash(id);
  const pick = <T>(list: readonly T[], shift: number) =>
    list[(h >> shift) % list.length];
  return {
    skin: pick(LOOK_OPTIONS.skin, 0),
    hair: pick(['short', 'bob', 'bun', 'long', 'curly'] as const, 3),
    hairColor: pick(['black', 'brown', 'chestnut', 'blonde'] as const, 6),
    eyes: 'dots',
    cheeks: 'rosy',
    glasses: (h >> 9) % 5 === 0 ? 'round' : 'none',
    hat: (h >> 12) % 4 === 0 ? 'cap' : 'none',
    outfit: 'tee',
    outfitColor: 'brand',
    extra: 'none',
    pet: 'none',
  };
}

/** A random look, for "Surprise me". */
export function randomLook(): Look {
  const look = {} as Record<LookPart, string>;
  for (const part of LOOK_PARTS) {
    const list = LOOK_OPTIONS[part];
    look[part] = list[Math.floor(Math.random() * list.length)];
  }
  return look as Look;
}

const tidy = (v: unknown) =>
  typeof v === 'string'
    ? v.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
    : null;

/**
 * Reads the parts of a look from `input`. Unknown parts are ignored, and a
 * value that is not on a part's list is reported in `errors`.
 */
export function parseLook(input: unknown) {
  const look: Partial<Look> = {};
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { look, errors };
  for (const part of LOOK_PARTS) {
    const raw = (input as Record<string, unknown>)[part];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = tidy(raw);
    const list = LOOK_OPTIONS[part] as readonly string[];
    if (value && list.includes(value))
      (look as Record<string, string>)[part] = value;
    else
      errors.push(
        `${part} "${String(raw)}" is not a choice. Pick one of: ${list.join(', ')}.`,
      );
  }
  return { look, errors };
}

/** Someone's look: what they saved, with anything missing from their default. */
export const lookOf = (id: string, saved?: unknown): Look => ({
  ...defaultLook(id),
  ...parseLook(saved).look,
});
