import type { BrandKit } from '@/lib/brandKit';

/*
 * Reading a brand kit for a project page's banner, as the phone app does
 * (mobile/src/lib/brand.ts), so both show the same image at the top.
 */

const hasAny = (kit?: BrandKit | null) =>
  !!kit &&
  !!(
    kit.logos?.length ||
    kit.colors?.length ||
    kit.fonts?.length ||
    kit.assets?.length
  );

/** The first kit that has anything in it. */
export const pickKit = (...kits: (BrandKit | null | undefined)[]) =>
  kits.find(hasAny) ?? null;

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

/** Every image in the kits, to pick a banner from. */
export const kitImages = (...kits: (BrandKit | null | undefined)[]) =>
  Array.from(
    new Set(
      kits.flatMap((kit) =>
        (kit?.assets ?? []).filter((a) => a.kind === 'image').map((a) => a.url),
      ),
    ),
  );

/** The kit's main colour and a second one, for a banner with no image. */
export function kitColors(kit?: BrandKit | null) {
  const colors = (kit?.colors ?? []).map((c) => c.hex.slice(0, 7));
  const main = kit?.colors?.find((c) =>
    /primary|brand|main/i.test(c.role ?? c.name),
  );
  const first = main?.hex.slice(0, 7) ?? colors[0] ?? null;
  return { main: first, second: colors.find((c) => c !== first) ?? null };
}
