import type { BrandKit } from './types';

/*
 * Reading a brand kit for the app's screens: its banner, main logo and
 * colours. The kits are the portal's (lib/brandKit.ts on the website):
 * logos, colours, fonts and files such as banners, intros and outros.
 */

const hasAny = (kit?: BrandKit | null) =>
  !!kit && !!(kit.logos?.length || kit.colors?.length || kit.fonts?.length || kit.assets?.length);

/** The first kit that has anything in it. */
export const pickKit = (...kits: (BrandKit | null | undefined)[]) => kits.find(hasAny) ?? null;

const BANNER = /banner|cover|header|hero|channel|youtube|wallpaper|background/i;
const WIDE = /banner|cover|header|channel art/i;

/** A wide image for the top of the page, if the kit has one. */
export function bannerOf(kit?: BrandKit | null) {
  const images = (kit?.assets ?? []).filter((a) => a.kind === 'image');
  return (
    images.find((a) => WIDE.test(a.label))?.url ??
    images.find((a) => BANNER.test(`${a.label} ${a.group ?? ''}`))?.url ??
    null
  );
}

/** The kit's main logo, as the website picks it: a mark or icon first. */
export function logoOf(kit?: BrandKit | null) {
  const logos = kit?.logos ?? [];
  return logos.find((l) => /mark|icon|logo|avatar|profile/i.test(l.label))?.url ?? logos[0]?.url ?? null;
}

/** The kit's main colour, then the rest. */
export function colorsOf(kit?: BrandKit | null) {
  const colors = (kit?.colors ?? []).map((c) => ({ ...c, hex: c.hex.slice(0, 7) }));
  const main = colors.find((c) => /primary|brand|main/i.test(c.role ?? c.name));
  return main ? [main, ...colors.filter((c) => c !== main)] : colors;
}

const lightness = (hex: string) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return 128;
  const n = parseInt(m[1], 16);
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
};

/**
 * A colour to draw with (bars, marks): the kit's accent or primary, never
 * one so dark or so light it would vanish on the app's backgrounds.
 */
export function accentOf(kit?: BrandKit | null) {
  const usable = colorsOf(kit).filter((c) => {
    const l = lightness(c.hex);
    return l > 45 && l < 215;
  });
  return (
    usable.find((c) => /accent|primary|highlight/i.test(`${c.role ?? ''} ${c.name}`))?.hex ??
    usable[0]?.hex ??
    null
  );
}

/** Files people open from the kit (not the logos): intros, outros, guides, banners… */
export function filesOf(kit?: BrandKit | null) {
  return kit?.assets ?? [];
}

/** Black or white, whichever reads better on a colour. */
export function inkOn(hex?: string | null) {
  const m = /^#?([0-9a-f]{6})/i.exec(hex ?? '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#111' : '#fff';
}
