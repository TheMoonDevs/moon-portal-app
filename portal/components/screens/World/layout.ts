import type { World } from '@/lib/world/state';

/*
 * Where everything stands. Towns are square blocks on a grid, joined by
 * highways. Each town has its square in the middle (people, the town hall
 * and the leaderboards), a road around it, and its buildings on lots in
 * rings around the square, best ranked first. Two cross roads run from the
 * square out to the highways.
 */

export type Spot = { x: number; z: number; angle: number };
export type TownSpot = Spot & {
  /** Half the width of the town's square block. */
  half: number;
  /** Centre lines of the town's ring roads, as distances from the middle. */
  rings: number[];
  /** Lots no building took, for parks. */
  parks: Spot[];
};
export type Road = { x1: number; z1: number; x2: number; z2: number };

/** Half the width of the town square. */
export const PLAZA = 14;
export const ROAD = 3;
export const LOT = 10;
const GAP = 30;

const ringRadius = (n: number) => PLAZA + ROAD + LOT / 2 + n * (LOT + ROAD);

/** The lots on ring `n`, walking the square around the middle. */
function lotsOnRing(n: number): Spot[] {
  const r = ringRadius(n);
  const k = Math.max(2, Math.floor((2 * r) / LOT));
  const step = (2 * r) / k;
  const clear = (LOT + ROAD) / 2;
  const out: Spot[] = [];
  for (let i = 0; i < k; i++) {
    const d = i * step;
    // Each lot faces the road on its inner side.
    const sides: Spot[] = [
      { x: r - d, z: r, angle: Math.PI },
      { x: -r, z: r - d, angle: Math.PI / 2 },
      { x: -r + d, z: -r, angle: 0 },
      { x: r, z: -r + d, angle: -Math.PI / 2 },
    ];
    for (const s of sides) {
      const onCross =
        s.angle === 0 || s.angle === Math.PI
          ? Math.abs(s.x) < clear
          : Math.abs(s.z) < clear;
      if (!onCross) out.push(s);
    }
  }
  // Furthest back first: the best ranked stand at the back, tallest, and
  // don't hide the square from the usual view.
  return out.sort((a, b) => a.x + a.z - (b.x + b.z) || a.x - b.x);
}

function lotsFor(count: number) {
  const lots: Spot[] = [];
  let ring = 0;
  while (lots.length < Math.max(count, 1)) lots.push(...lotsOnRing(ring++));
  return { lots, rings: ring };
}

export const townHalf = (buildings: number) =>
  buildings
    ? ringRadius(lotsFor(buildings).rings - 1) + LOT / 2 + ROAD + 4
    : PLAZA + ROAD + 6;

/** The people's places on the square: rows facing the usual view. */
function crowd(n: number) {
  const perRow = n > 18 ? 8 : 6;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const u = (i - row * perRow - (inRow - 1) / 2) * 2.3;
    const v = 5 + row * 2.3;
    return {
      x: (u + v) / Math.SQRT2,
      z: (v - u) / Math.SQRT2,
      angle: Math.PI / 4,
    };
  });
}

export function layoutWorld(world: World) {
  const counts = world.towns.map(
    (t) => world.buildings.filter((b) => b.townId === t.id).length,
  );
  const halves = counts.map(townHalf);
  const spacing = Math.max(...halves, 0) * 2 + GAP;
  const cols = Math.max(1, Math.ceil(Math.sqrt(world.towns.length)));
  const rows = Math.max(1, Math.ceil(world.towns.length / cols));

  const towns = new Map<string, TownSpot>();
  const buildings = new Map<string, Spot>();
  const people = new Map<string, Spot>();

  world.towns.forEach((t, i) => {
    const x = ((i % cols) - (cols - 1) / 2) * spacing;
    const z = (Math.floor(i / cols) - (rows - 1) / 2) * spacing;
    const { lots, rings } = lotsFor(counts[i]);
    const mine = world.buildings
      .filter((b) => b.townId === t.id)
      .sort((a, b) => a.rank - b.rank);
    mine.forEach((b, j) =>
      buildings.set(b.id, {
        x: x + lots[j].x,
        z: z + lots[j].z,
        angle: lots[j].angle,
      }),
    );
    towns.set(t.id, {
      x,
      z,
      angle: 0,
      half: halves[i],
      rings: [
        PLAZA + ROAD / 2,
        ...Array.from(
          { length: counts[i] ? rings : 0 },
          (_, n) => ringRadius(n) + LOT / 2 + ROAD / 2,
        ),
      ],
      parks: lots
        .slice(mine.length)
        .map((l) => ({ ...l, x: x + l.x, z: z + l.z })),
    });

    const here = world.people.filter((p) => p.townIds.includes(t.id));
    crowd(here.length).forEach((spot, j) =>
      people.set(`${t.id}:${here[j].id}`, {
        x: x + spot.x,
        z: z + spot.z,
        angle: spot.angle,
      }),
    );
  });

  // Highways along every row and column of towns, between their edges and
  // out past the last town.
  const roads: Road[] = [];
  const reach = GAP + 20;
  const line = (
    stops: { at: number; half: number }[],
    put: (a: number, b: number) => Road,
  ) => {
    stops.sort((a, b) => a.at - b.at);
    const first = stops[0];
    const last = stops[stops.length - 1];
    roads.push(put(first.at - first.half - reach, first.at - first.half));
    for (let i = 0; i + 1 < stops.length; i++)
      roads.push(
        put(stops[i].at + stops[i].half, stops[i + 1].at - stops[i + 1].half),
      );
    roads.push(put(last.at + last.half, last.at + last.half + reach));
  };
  const all = Array.from(towns.values());
  for (const z of Array.from(new Set(all.map((t) => t.z))))
    line(
      all.filter((t) => t.z === z).map((t) => ({ at: t.x, half: t.half })),
      (a, b) => ({ x1: a, z1: z, x2: b, z2: z }),
    );
  for (const x of Array.from(new Set(all.map((t) => t.x))))
    line(
      all.filter((t) => t.x === x).map((t) => ({ at: t.z, half: t.half })),
      (a, b) => ({ x1: x, z1: a, x2: x, z2: b }),
    );

  return {
    towns,
    buildings,
    people,
    roads,
    spacing,
    cols,
    rows,
    /** How wide the whole world is, edge to edge. */
    extent: Math.max(cols, rows) * spacing,
  };
}

/** Small deterministic random numbers, so trees stay where they grew. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}
