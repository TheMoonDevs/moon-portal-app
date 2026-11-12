/*
 * The month's "buff": its points set a level with a picture, as on the
 * website's worklogs page and leaderboard (portal/lib/progress/buff.ts).
 * The pictures are the portal's own, under /images/buff/.
 */

export type Buff = {
  title: string;
  /** Points where this level starts. */
  marker: number;
  /** Points where the next level starts. */
  next: number;
  src: string;
};

const LEVELS: Buff[] = [
  { title: 'Tiny Chirp', marker: 1, next: 25, src: '/images/buff/tinyChirp.png' },
  { title: 'Seedling Sprout', marker: 25, next: 50, src: '/images/buff/seedlingSprout.png' },
  { title: 'Baby Groot', marker: 50, next: 100, src: '/images/buff/babyGroot.png' },
  { title: 'Work Hulk', marker: 100, next: 200, src: '/images/buff/workHulk.png' },
  { title: 'Night Owl', marker: 200, next: 300, src: '/images/buff/nightOwl.png' },
  { title: 'Rocket Fox', marker: 300, next: 400, src: '/images/buff/rocketFox.png' },
  { title: 'Storm Rhino', marker: 400, next: 500, src: '/images/buff/stormRhino.png' },
  { title: 'Vampire Streak', marker: 500, next: 600, src: '/images/buff/vampireLord.png' },
  { title: 'Deep Kraken', marker: 600, next: 700, src: '/images/buff/deepKraken.png' },
  { title: 'Dragon Force', marker: 700, next: 800, src: '/images/buff/dragonForce.png' },
  { title: 'Moon Devil', marker: 800, next: 900, src: '/images/buff/moonDevil.png' },
  { title: 'Phoenix Rising', marker: 900, next: 1000, src: '/images/buff/phoenixRising.png' },
  { title: 'Moon Titan', marker: 1000, next: 1100, src: '/images/buff/moonTitan.png' },
];

/** The level a month's points reach. */
export const buffOf = (points: number): Buff =>
  [...LEVELS].reverse().find((l) => points >= l.marker && l.marker > 1) ?? LEVELS[0];

/** How far through its level the points are, 0 to 100. */
export function buffProgress(points: number) {
  const level = buffOf(points);
  const start = level.marker > 1 ? level.marker : 0;
  return Math.max(0, Math.min(100, ((points - start) / (level.next - start)) * 100));
}
