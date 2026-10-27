/*
 * Brand kits for companies and projects: logos, colors, fonts, a written
 * guide and any other brand files (intros, outros, banners, audio…).
 *
 * The shape mirrors the brand folders used for video work
 * (`brands/<name>/{colors.json, brandguide.md, fonts/, logo/, intros/, …}`),
 * so a whole folder can be imported in one go. Pure: safe on client and
 * server.
 */

export type BrandAssetKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'font'
  | 'document'
  | 'other';

export type BrandLogo = {
  label: string;
  url: string;
  /** Background it is meant for, when the kit says so (dark, light, …). */
  background?: string;
};

export type BrandColor = { name: string; hex: string; role?: string };

export type BrandFont = {
  family: string;
  weight?: number;
  url?: string;
  role?: string;
};

export type BrandAsset = {
  label: string;
  url: string;
  kind: BrandAssetKind;
  /** The folder it came from: intros, outros, youtube, guide, audio… */
  group?: string;
};

export type BrandKit = {
  name?: string;
  spectrum?: string;
  note?: string;
  logos: BrandLogo[];
  colors: BrandColor[];
  fonts: BrandFont[];
  guide?: string;
  assets: BrandAsset[];
  updatedAt?: string;
};

export const emptyBrandKit = (): BrandKit => ({
  logos: [],
  colors: [],
  fonts: [],
  assets: [],
});

export const isBrandKitEmpty = (kit?: BrandKit | null) =>
  !kit ||
  (!kit.logos?.length &&
    !kit.colors?.length &&
    !kit.fonts?.length &&
    !kit.assets?.length &&
    !kit.guide?.trim());

/* ------------------------------- Sanitizing ------------------------------- */

const LIMITS = { logos: 40, colors: 60, fonts: 30, assets: 200 };
const GUIDE_MAX = 100_000;

const str = (v: unknown, max = 300) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const url = (v: unknown) => {
  const s = str(v, 2000);
  return /^https:\/\//i.test(s) ? s : '';
};

export const normalizeHex = (v: unknown) => {
  const s = str(v, 9).replace(/^#?/, '#');
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return `#${s
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`.toUpperCase();
  }
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s) ? s.toUpperCase() : '';
};

const KINDS: BrandAssetKind[] = [
  'image',
  'video',
  'audio',
  'font',
  'document',
  'other',
];

const list = <T>(v: unknown, max: number, map: (x: any) => T | null): T[] =>
  Array.isArray(v)
    ? v
        .slice(0, max)
        .map(map)
        .filter((x): x is T => !!x)
    : [];

/** Keeps only well-formed fields, so stored kits are always this shape. */
export function sanitizeBrandKit(input: unknown): BrandKit | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const kit: BrandKit = {
    name: str(raw.name, 120) || undefined,
    spectrum: str(raw.spectrum, 300) || undefined,
    note: str(raw.note, 1000) || undefined,
    logos: list(raw.logos, LIMITS.logos, (l) =>
      url(l?.url)
        ? {
            label: str(l.label, 120) || 'Logo',
            url: url(l.url),
            background: str(l.background, 40) || undefined,
          }
        : null,
    ),
    colors: list(raw.colors, LIMITS.colors, (c) =>
      normalizeHex(c?.hex)
        ? {
            name: str(c.name, 80) || normalizeHex(c.hex),
            hex: normalizeHex(c.hex),
            role: str(c.role, 300) || undefined,
          }
        : null,
    ),
    fonts: list(raw.fonts, LIMITS.fonts, (f) =>
      str(f?.family, 80)
        ? {
            family: str(f.family, 80),
            weight: Number.isFinite(Number(f.weight))
              ? Math.min(1000, Math.max(1, Number(f.weight)))
              : undefined,
            url: url(f.url) || undefined,
            role: str(f.role, 120) || undefined,
          }
        : null,
    ),
    guide: str(raw.guide, GUIDE_MAX) || undefined,
    assets: list(raw.assets, LIMITS.assets, (a) =>
      url(a?.url)
        ? {
            label: str(a.label, 160) || 'File',
            url: url(a.url),
            kind: KINDS.includes(a.kind) ? a.kind : 'other',
            group: str(a.group, 40).toLowerCase() || undefined,
          }
        : null,
    ),
    updatedAt: new Date().toISOString(),
  };
  // Drop undefined keys so Mongo stores a tidy document.
  return JSON.parse(JSON.stringify(kit));
}

/** The main logo and color for places that show just one of each. */
export function brandKitDefaults(kit?: BrandKit | null) {
  if (!kit) return { logo: '', color: '' };
  const logo =
    kit.logos.find((l) => /mark|icon|logo/i.test(l.label))?.url ??
    kit.logos[0]?.url ??
    '';
  const color =
    kit.colors.find((c) => /primary|brand|main/i.test(c.role ?? c.name))?.hex ??
    kit.colors[0]?.hex ??
    '';
  return { logo, color: color.slice(0, 7) };
}

/* --------------------------- Reading brand files -------------------------- */

const EXT_KIND: Record<string, BrandAssetKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  svg: 'image',
  ico: 'image',
  avif: 'image',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
  flac: 'audio',
  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  pdf: 'document',
  md: 'document',
  txt: 'document',
  json: 'document',
  css: 'document',
};

export const extOf = (name: string) =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

export const kindOf = (name: string): BrandAssetKind =>
  EXT_KIND[extOf(name)] ?? 'other';

/**
 * Folders a brand folder may hold that are not brand material: `graphics/`
 * is the kit's source (scenes, reference frames, raw sounds), at any depth.
 */
export const isSkippedBrandDir = (name: string) =>
  name.startsWith('.') || /^(graphics|node_modules|__MACOSX)$/i.test(name);

/** Paths a brand folder import never reads or uploads. */
export const isIgnoredBrandPath = (path: string) =>
  path.split('/').slice(0, -1).some(isSkippedBrandDir) || /(^|\/)\./.test(path);

/** Only media is uploaded from a brand folder: images, video, audio, fonts. */
export const isBrandMediaFile = (name: string) =>
  ['image', 'video', 'audio', 'font'].includes(kindOf(name));

const WEIGHTS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

/** "Outfit-700.ttf" → Outfit 700; "Inter-SemiBold.woff2" → Inter 600. */
export function parseFontFileName(name: string): {
  family: string;
  weight?: number;
} {
  const base = name.replace(/\.[^.]+$/, '');
  const [family, ...rest] = base.split(/[-_ ]/);
  const tail = rest.join('').toLowerCase();
  const weight = /^\d{3}$/.test(tail)
    ? Number(tail)
    : (WEIGHTS[tail.replace(/italic$/, '')] ?? undefined);
  return { family: family || base, weight };
}

/** Reads `colors.json` from a brand folder (or anything shaped like it). */
export function parseColorsJson(text: string): Partial<BrandKit> | null {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const colors: BrandColor[] = (
    Array.isArray(data) ? data : Array.isArray(data?.colors) ? data.colors : []
  )
    .map((c: any) => {
      const hex =
        normalizeHex(c?.hex) ||
        (Array.isArray(c?.rgb) && c.rgb.length >= 3
          ? normalizeHex(
              c.rgb
                .slice(0, 3)
                .map((n: number) =>
                  Math.max(0, Math.min(255, Number(n) || 0))
                    .toString(16)
                    .padStart(2, '0'),
                )
                .join(''),
            )
          : '');
      return hex
        ? { name: str(c?.name, 80) || hex, hex, role: str(c?.role, 300) }
        : null;
    })
    .filter(Boolean);
  if (!colors.length) return null;
  return {
    name: str(data?.name, 120) || undefined,
    spectrum: str(data?.spectrum, 300) || undefined,
    note: str(data?.note, 1000) || undefined,
    colors,
  };
}

/** Prettifies a file name for display: "mark-glow.svg" → "Mark glow". */
export const labelFromFileName = (name: string) => {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : name;
};

export const BRAND_GROUP_LABELS: Record<string, string> = {
  intros: 'Intros',
  outros: 'Outros',
  youtube: 'YouTube',
  guide: 'Guide pages',
  audio: 'Audio',
  graphics: 'Graphics',
  social: 'Social',
  other: 'Other files',
};
