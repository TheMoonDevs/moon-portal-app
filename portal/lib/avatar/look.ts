/*
 * How someone's little character in the World looks. Every part is a
 * name from a short list, so the Settings page and Claude (through the
 * MCP tools) choose from the same things.
 */

export const LOOK_OPTIONS = {
  skin: ['porcelain', 'peach', 'tan', 'olive', 'brown', 'deep'],
  eyes: ['dots', 'big', 'anime', 'happy', 'sleepy', 'wink', 'stars'],
  eyeColor: ['brown', 'blue', 'green', 'violet', 'red', 'gold'],
  mouth: ['smile', 'grin', 'open', 'cat', 'tongue'],
  cheeks: ['rosy', 'freckles', 'none'],
  marks: ['none', 'blush lines', 'whiskers', 'scar', 'star'],
  glasses: ['none', 'round', 'square', 'shades', 'hearts'],
  hair: [
    'short',
    'side bangs',
    'bob',
    'bun',
    'topknot',
    'ponytail',
    'long',
    'pigtails',
    'twin tails',
    'curly',
    'afro',
    'spiky',
    'hero spikes',
    'mohawk',
    'bald',
  ],
  hairColor: [
    'black',
    'brown',
    'chestnut',
    'ginger',
    'red',
    'blonde',
    'gold',
    'silver',
    'white',
    'pink',
    'blue',
    'teal',
    'purple',
    'mint',
  ],
  hat: [
    'none',
    'cap',
    'beanie',
    'party hat',
    'crown',
    'headphones',
    'flower',
    'ahoge',
    'cat ears',
    'bunny ears',
    'horns',
    'halo',
    'ninja headband',
    'straw hat',
    'wizard hat',
  ],
  outfit: [
    'tee',
    'hoodie',
    'jacket',
    'overalls',
    'suit',
    'dress',
    'sailor',
    'ninja',
    'kimono',
    'robe',
    'armor',
  ],
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
  shoes: ['white', 'black', 'red', 'blue', 'boots'],
  extra: [
    'none',
    'backpack',
    'scarf',
    'cape',
    'wings',
    'balloon',
    'katana',
    'staff',
    'book',
    'coffee',
  ],
  pet: [
    'none',
    'cat',
    'dog',
    'bunny',
    'chick',
    'fox',
    'panda',
    'dragon',
    'slime',
  ],
  aura: ['none', 'sparkles', 'hearts', 'glow'],
} as const;

export type LookPart = keyof typeof LOOK_OPTIONS;
export type Look = { [K in LookPart]: (typeof LOOK_OPTIONS)[K][number] };

export const LOOK_PARTS = Object.keys(LOOK_OPTIONS) as LookPart[];

export const LOOK_LABELS: Record<LookPart, string> = {
  skin: 'Skin',
  eyes: 'Eyes',
  eyeColor: 'Eye colour (anime eyes)',
  mouth: 'Mouth',
  cheeks: 'Cheeks',
  marks: 'Face marks',
  glasses: 'Glasses',
  hair: 'Hair',
  hairColor: 'Hair colour',
  hat: 'On the head',
  outfit: 'Outfit',
  outfitColor: 'Outfit colour',
  shoes: 'Shoes',
  extra: 'Extra',
  pet: 'Pet',
  aura: 'Aura',
};

/** The editor's tabs, so it never shows everything at once. */
export const LOOK_GROUPS: { label: string; parts: LookPart[] }[] = [
  {
    label: 'Face',
    parts: ['skin', 'eyes', 'eyeColor', 'mouth', 'cheeks', 'marks', 'glasses'],
  },
  { label: 'Hair', parts: ['hair', 'hairColor', 'hat'] },
  { label: 'Outfit', parts: ['outfit', 'outfitColor', 'shoes'] },
  { label: 'Extras', parts: ['extra', 'pet', 'aura'] },
];

export const SKIN_HEX: Record<Look['skin'], string> = {
  porcelain: '#fbe3d0',
  peach: '#f3cfae',
  tan: '#dca77f',
  olive: '#c19a6b',
  brown: '#94603f',
  deep: '#6b4429',
};

export const EYE_HEX: Record<Look['eyeColor'], string> = {
  brown: '#8b5a2b',
  blue: '#3b82f6',
  green: '#22c55e',
  violet: '#8b5cf6',
  red: '#e11d48',
  gold: '#f59e0b',
};

export const HAIR_HEX: Record<Look['hairColor'], string> = {
  black: '#24201c',
  brown: '#4a3326',
  chestnut: '#7a4b2a',
  ginger: '#c8642c',
  red: '#d6303a',
  blonde: '#e3b862',
  gold: '#fcd34d',
  silver: '#c9ccd3',
  white: '#f4f4f5',
  pink: '#f49ac1',
  blue: '#6ea8fe',
  teal: '#2dd4bf',
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

export const SHOE_HEX: Record<Look['shoes'], string> = {
  white: '#ffffff',
  black: '#27272a',
  red: '#ef4444',
  blue: '#3b82f6',
  boots: '#5b3a24',
};

/** The plainest look: what a style starts from before its own parts. */
const PLAIN: Omit<Look, 'skin'> = {
  eyes: 'dots',
  eyeColor: 'brown',
  mouth: 'smile',
  cheeks: 'rosy',
  marks: 'none',
  glasses: 'none',
  hair: 'short',
  hairColor: 'black',
  hat: 'none',
  outfit: 'tee',
  outfitColor: 'brand',
  shoes: 'white',
  extra: 'none',
  pet: 'none',
  aura: 'none',
};

/** Anime styles: whole looks in one tap. Skin is always kept. */
export const LOOK_STYLES: {
  name: string;
  emoji: string;
  look: Partial<Look>;
}[] = [
  {
    name: 'Ninja',
    emoji: '🥷',
    look: {
      eyes: 'anime',
      eyeColor: 'blue',
      mouth: 'grin',
      marks: 'whiskers',
      hair: 'spiky',
      hairColor: 'blonde',
      hat: 'ninja headband',
      outfit: 'ninja',
      outfitColor: 'orange',
      shoes: 'black',
      pet: 'fox',
    },
  },
  {
    name: 'Spiky hero',
    emoji: '⚡',
    look: {
      eyes: 'anime',
      eyeColor: 'green',
      mouth: 'grin',
      hair: 'hero spikes',
      hairColor: 'gold',
      outfit: 'ninja',
      outfitColor: 'orange',
      shoes: 'boots',
      aura: 'glow',
    },
  },
  {
    name: 'Pirate',
    emoji: '🏴‍☠️',
    look: {
      eyes: 'big',
      mouth: 'grin',
      marks: 'scar',
      hair: 'short',
      hairColor: 'black',
      hat: 'straw hat',
      outfit: 'jacket',
      outfitColor: 'red',
      shoes: 'black',
    },
  },
  {
    name: 'Samurai',
    emoji: '⚔️',
    look: {
      eyes: 'anime',
      eyeColor: 'brown',
      mouth: 'smile',
      hair: 'topknot',
      hairColor: 'black',
      outfit: 'kimono',
      outfitColor: 'blue',
      shoes: 'black',
      extra: 'katana',
    },
  },
  {
    name: 'Pop idol',
    emoji: '🎤',
    look: {
      eyes: 'anime',
      eyeColor: 'blue',
      mouth: 'open',
      marks: 'blush lines',
      hair: 'twin tails',
      hairColor: 'teal',
      outfit: 'sailor',
      outfitColor: 'black',
      shoes: 'black',
      aura: 'sparkles',
    },
  },
  {
    name: 'Magical girl',
    emoji: '🪄',
    look: {
      eyes: 'stars',
      mouth: 'cat',
      marks: 'blush lines',
      hair: 'twin tails',
      hairColor: 'pink',
      hat: 'flower',
      outfit: 'dress',
      outfitColor: 'pink',
      extra: 'staff',
      pet: 'bunny',
      aura: 'hearts',
    },
  },
  {
    name: 'Wizard',
    emoji: '🧙',
    look: {
      eyes: 'sleepy',
      hair: 'long',
      hairColor: 'silver',
      hat: 'wizard hat',
      outfit: 'robe',
      outfitColor: 'purple',
      extra: 'staff',
      pet: 'dragon',
      aura: 'sparkles',
    },
  },
  {
    name: 'Student',
    emoji: '📚',
    look: {
      eyes: 'anime',
      eyeColor: 'violet',
      mouth: 'smile',
      hair: 'side bangs',
      hairColor: 'brown',
      hat: 'ahoge',
      outfit: 'sailor',
      outfitColor: 'blue',
      shoes: 'black',
      extra: 'book',
      pet: 'slime',
    },
  },
  {
    name: 'Demon king',
    emoji: '😈',
    look: {
      eyes: 'anime',
      eyeColor: 'red',
      mouth: 'grin',
      hair: 'long',
      hairColor: 'white',
      hat: 'horns',
      outfit: 'armor',
      outfitColor: 'black',
      shoes: 'boots',
      extra: 'cape',
      aura: 'glow',
    },
  },
];

/** `look` dressed in the style called `name` (any case), or null. */
export function styled(look: Look, name: string): Look | null {
  const style = LOOK_STYLES.find(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return style ? { skin: look.skin, ...PLAIN, ...style.look } : null;
}

const hash = (s: string) =>
  Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

/** The look someone has before they choose one: picked from their id. */
export function defaultLook(id: string): Look {
  const h = hash(id);
  const pick = <T>(list: readonly T[], shift: number) =>
    list[(h >> shift) % list.length];
  return {
    ...PLAIN,
    skin: pick(LOOK_OPTIONS.skin, 0),
    hair: pick(['short', 'bob', 'bun', 'long', 'curly'] as const, 3),
    hairColor: pick(['black', 'brown', 'chestnut', 'blonde'] as const, 6),
    glasses: (h >> 9) % 5 === 0 ? 'round' : 'none',
    hat: (h >> 12) % 4 === 0 ? 'cap' : 'none',
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

/* ------------------------------- the lock ------------------------------- */

/** After saving a look, the next change waits this many days… */
export const LOOK_LOCK_DAYS = 30;
/** …unless they earn this many work points first. */
export const LOOK_UNLOCK_POINTS = 100;

export type LookLock = {
  /** True while they cannot save a new look. */
  locked: boolean;
  /** When they last saved one (null: never, so the first is free). */
  setAt: string | null;
  /** When the lock ends on its own. */
  until: string | null;
  /** Work points earned since they last saved. */
  pointsSince: number;
  /** Points still needed to unlock early. */
  pointsToGo: number;
};

/** What to tell someone about the lock, in one sentence. */
export function lockMessage(lock: LookLock) {
  if (!lock.locked)
    return lock.setAt
      ? 'You can change your look now.'
      : `Your first look is free. After that you can change it every ${LOOK_LOCK_DAYS} days, or sooner after ${LOOK_UNLOCK_POINTS} work points.`;
  const until = new Date(lock.until!).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `Your look is set until ${until}. Earn ${lock.pointsToGo} more work point${lock.pointsToGo === 1 ? '' : 's'} to change it sooner.`;
}
