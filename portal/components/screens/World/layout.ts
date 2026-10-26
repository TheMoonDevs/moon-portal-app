import type { World } from '@/lib/world/state';
import { SITES_PER_SQUARE } from '@/lib/world/state';

/*
 * Where everything stands. A town grows square by square: the town square
 * first, then each project's squares (four task buildings to a square), and
 * every four squares join into a bigger square, which is the next size up's
 * building block (Z-order). The roads between bigger squares are wider.
 * Square 0 sits at the front corner of the usual view, so the town grows
 * away from it and the square is never hidden. Towns sit on a grid, joined
 * by highways.
 */

export type Spot = { x: number; z: number; angle: number };
export type Cell = {
  x: number;
  z: number;
  kind: 'plaza' | 'project' | 'park';
  projectId?: string;
};
export type Area = {
  x: number;
  z: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};
export type TownSpot = Area & {
  /** The town square: its middle and half its width. */
  plaza: { x: number; z: number; half: number };
  cells: Cell[];
  /** Road centre lines across the whole town, with their widths. */
  streetsX: { at: number; width: number }[];
  streetsZ: { at: number; width: number }[];
};
export type Road = { x1: number; z1: number; x2: number; z2: number };

/** One task building's lot. */
export const LOT = 10;
/** One square: two lots by two. */
export const BLOCK = LOT * 2;
const EDGE = 4;
const GAP = 34;

/** How deep in the squares-of-squares a road is: wider the deeper. */
const depth = (i: number) => {
  let n = 0;
  while (i > 0 && i % 2 === 0) {
    i /= 2;
    n += 1;
  }
  return n;
};
const streetWidth = (i: number) => 4 + depth(i) * 2;

/** Where square `i` starts along one side, from the town's edge. */
const startOf = (i: number) => {
  let at = EDGE;
  for (let j = 1; j <= i; j++) at += BLOCK + streetWidth(j);
  return at;
};

/** The n-th square in Z-order. */
function zOrder(n: number) {
  let x = 0;
  let y = 0;
  for (let bit = 0; n >> (bit * 2); bit++) {
    x |= ((n >> (bit * 2)) & 1) << bit;
    y |= ((n >> (bit * 2 + 1)) & 1) << bit;
  }
  return { x, y };
}

/** The squares a project needs for its task buildings. */
export const squaresFor = (sites: number) =>
  Math.max(1, Math.ceil(sites / SITES_PER_SQUARE));

/** The town's squares in Z-order: the town square, then each project. */
function plan(projects: { id: string; squares: number }[]) {
  const owner: (string | null)[] = ['plaza', 'plaza', 'plaza', 'plaza'];
  for (const p of projects) {
    // Line projects up so two squares sit side by side and three or more
    // fill a square of squares.
    const align = p.squares >= 3 ? 4 : p.squares;
    while (owner.length % align) owner.push(null);
    for (let i = 0; i < p.squares; i++) owner.push(p.id);
  }
  return owner;
}

/** Lots in a square, back first: the busiest building stands at the back. */
export const LOTS = [
  { dx: -LOT / 2, dz: -LOT / 2, angle: Math.PI },
  { dx: LOT / 2, dz: -LOT / 2, angle: Math.PI },
  { dx: -LOT / 2, dz: LOT / 2, angle: 0 },
  { dx: LOT / 2, dz: LOT / 2, angle: 0 },
];

/** People's places on the square: rows facing the usual view. */
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

function layoutTown(world: World, townId: string) {
  const projects = world.projects
    .filter((p) => p.townId === townId)
    .sort((a, b) => a.rank - b.rank);
  const owner = plan(
    projects.map((p) => ({ id: p.id, squares: squaresFor(p.sites.length) })),
  );
  const grid = owner.map((_, n) => zOrder(n));
  const nx = Math.max(...grid.map((g) => g.x)) + 1;
  const nz = Math.max(...grid.map((g) => g.y)) + 1;

  // Down the middle runs the widest road: the town is centred on it, and
  // the highways meet the town there.
  const middle = (n: number) => {
    const half = 2 ** Math.max(0, Math.ceil(Math.log2(n)) - 1);
    return startOf(half) - streetWidth(half) / 2;
  };
  const ux = middle(nx);
  const uz = middle(nz);
  // Square 0 at the front (+x, +z); the town grows toward -x and -z.
  const toX = (u: number) => ux - u;
  const toZ = (v: number) => uz - v;

  const byIndex = new Map(grid.map((g, n) => [`${g.x},${g.y}`, n]));
  const cells: Cell[] = [];
  for (let gx = 0; gx < nx; gx++)
    for (let gz = 0; gz < nz; gz++) {
      const n = byIndex.get(`${gx},${gz}`);
      const who = n === undefined ? null : owner[n];
      if (who === 'plaza') continue;
      cells.push({
        x: toX(startOf(gx) + BLOCK / 2),
        z: toZ(startOf(gz) + BLOCK / 2),
        kind: who ? 'project' : 'park',
        projectId: who ?? undefined,
      });
    }
  const plazaFar = startOf(1) + BLOCK;
  const plaza = {
    x: toX((EDGE + plazaFar) / 2),
    z: toZ((EDGE + plazaFar) / 2),
    half: (plazaFar - EDGE) / 2,
  };
  cells.unshift({ x: plaza.x, z: plaza.z, kind: 'plaza' });

  const lines = (n: number, to: (u: number) => number) => [
    { at: to(EDGE / 2), width: EDGE },
    ...Array.from({ length: n - 1 }, (_, k) => ({
      at: to(startOf(k + 1) - streetWidth(k + 1) / 2),
      width: streetWidth(k + 1),
    })),
    { at: to(startOf(n - 1) + BLOCK + EDGE / 2), width: EDGE },
  ];
  const far = (n: number) => startOf(n - 1) + BLOCK + EDGE;
  return {
    projects,
    cells,
    plaza,
    streetsX: lines(nx, toX),
    streetsZ: lines(nz, toZ),
    minX: toX(far(nx)),
    maxX: toX(0),
    minZ: toZ(far(nz)),
    maxZ: toZ(0),
  };
}

export function layoutWorld(world: World) {
  const plans = world.towns.map((t) => layoutTown(world, t.id));
  const reach = Math.max(
    ...plans.map((p) => Math.max(-p.minX, p.maxX, -p.minZ, p.maxZ)),
  );
  const spacing = reach * 2 + GAP;
  const cols = Math.max(1, Math.ceil(Math.sqrt(world.towns.length)));
  const rows = Math.max(1, Math.ceil(world.towns.length / cols));

  const towns = new Map<string, TownSpot>();
  const projects = new Map<string, Area & { cells: Cell[] }>();
  const sites = new Map<string, Spot & { projectId: string }>();
  const people = new Map<string, Spot>();

  world.towns.forEach((t, i) => {
    const x = ((i % cols) - (cols - 1) / 2) * spacing;
    const z = (Math.floor(i / cols) - (rows - 1) / 2) * spacing;
    const p = plans[i];
    const cells = p.cells.map((c) => ({ ...c, x: x + c.x, z: z + c.z }));
    const plaza = { ...p.plaza, x: x + p.plaza.x, z: z + p.plaza.z };
    towns.set(t.id, {
      x,
      z,
      minX: x + p.minX,
      maxX: x + p.maxX,
      minZ: z + p.minZ,
      maxZ: z + p.maxZ,
      plaza,
      cells,
      streetsX: p.streetsX.map((s) => ({ ...s, at: x + s.at })),
      streetsZ: p.streetsZ.map((s) => ({ ...s, at: z + s.at })),
    });

    for (const project of p.projects) {
      const mine = cells.filter((c) => c.projectId === project.id);
      const xs = mine.map((c) => c.x);
      const zs = mine.map((c) => c.z);
      projects.set(project.id, {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        z: (Math.min(...zs) + Math.max(...zs)) / 2,
        minX: Math.min(...xs) - BLOCK / 2,
        maxX: Math.max(...xs) + BLOCK / 2,
        minZ: Math.min(...zs) - BLOCK / 2,
        maxZ: Math.max(...zs) + BLOCK / 2,
        cells: mine,
      });
      // Busiest buildings in the back squares, four to a square.
      const ordered = [...mine].sort((a, b) => a.x + a.z - (b.x + b.z));
      project.sites.forEach((site, k) => {
        const cell = ordered[Math.floor(k / SITES_PER_SQUARE)];
        const lot = LOTS[k % SITES_PER_SQUARE];
        if (!cell) return;
        sites.set(site.id, {
          x: cell.x + lot.dx,
          z: cell.z + lot.dz,
          angle: lot.angle,
          projectId: project.id,
        });
      });
    }

    const here = world.people.filter((person) => person.townIds.includes(t.id));
    crowd(here.length).forEach((spot, j) =>
      people.set(`${t.id}:${here[j].id}`, {
        x: plaza.x + spot.x,
        z: plaza.z + spot.z,
        angle: spot.angle,
      }),
    );
  });

  // Highways along every row and column of towns, meeting each town on its
  // middle road, and out past the last town.
  const roads: Road[] = [];
  const out = GAP + 24;
  const line = (
    stops: { from: number; to: number }[],
    put: (a: number, b: number) => Road,
  ) => {
    stops.sort((a, b) => a.from - b.from);
    roads.push(put(stops[0].from - out, stops[0].from));
    for (let i = 0; i + 1 < stops.length; i++)
      roads.push(put(stops[i].to, stops[i + 1].from));
    roads.push(
      put(stops[stops.length - 1].to, stops[stops.length - 1].to + out),
    );
  };
  const all = Array.from(towns.values());
  for (const z of Array.from(new Set(all.map((t) => t.z))))
    line(
      all.filter((t) => t.z === z).map((t) => ({ from: t.minX, to: t.maxX })),
      (a, b) => ({ x1: a, z1: z, x2: b, z2: z }),
    );
  for (const x of Array.from(new Set(all.map((t) => t.x))))
    line(
      all.filter((t) => t.x === x).map((t) => ({ from: t.minZ, to: t.maxZ })),
      (a, b) => ({ x1: x, z1: a, x2: x, z2: b }),
    );

  return {
    towns,
    projects,
    sites,
    people,
    roads,
    spacing,
    cols,
    rows,
    /** How wide the whole world is, edge to edge. */
    extent: Math.max(cols, rows) * spacing,
  };
}

/**
 * The way along the roads from `a` to `b` in a town: out to the nearest
 * road, along it, across on a cross road, and in again.
 */
export function route(
  town: TownSpot,
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const nearest = (lines: { at: number }[], v: number) =>
    lines.reduce(
      (best, l) => (Math.abs(l.at - v) < Math.abs(best - v) ? l.at : best),
      lines[0].at,
    );
  const za = nearest(town.streetsZ, a.z);
  const zb = nearest(town.streetsZ, b.z);
  const points = [
    { x: a.x, z: a.z },
    { x: a.x, z: za },
  ];
  if (Math.abs(za - zb) < 0.01) points.push({ x: b.x, z: za });
  else {
    const xv = nearest(town.streetsX, (a.x + b.x) / 2);
    points.push({ x: xv, z: za }, { x: xv, z: zb }, { x: b.x, z: zb });
  }
  points.push({ x: b.x, z: b.z });
  // Drop steps that go nowhere.
  return points.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) > 0.05,
  );
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
