import type { World } from '@/lib/world/state';
import { LOTS_PER_SQUARE, siteLots } from '@/lib/world/state';

/*
 * Where everything stands. A town grows square by square: the town square
 * first, then each project's squares (three buildings to a square, one on
 * each lot, with the fourth corner a garden), and
 * every four squares join into a bigger square, which is the next size up's
 * building block (Z-order). The roads between bigger squares are wider.
 * Everyone in the town has their own plot on the town square, where they
 * stand and their bots come to report; when the plots run out the square
 * grows to the next size up (two squares by two, then four by four, …).
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
  /** In front of the town hall, where work outside any project is done. */
  yard: { x: number; z: number };
  cells: Cell[];
  /**
   * Road centre lines across the whole town, with their widths. A road is
   * open when no square's paving (the town square or a project's ground)
   * covers any of it: only open roads carry cars.
   */
  streetsX: Street[];
  streetsZ: Street[];
};
export type Street = { at: number; width: number; open: boolean };
export type Road = { x1: number; z1: number; x2: number; z2: number };

/** One building's lot. */
export const LOT = 12;
/** One square: room for two lots by two, with space between them. */
export const BLOCK = 30;
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

/** The squares a project needs for its lots. */
export const squaresFor = (lots: number) =>
  Math.max(1, Math.ceil(lots / LOTS_PER_SQUARE));

/** The town's squares in Z-order: the town square, then each project. */
function plan(projects: { id: string; squares: number }[], plaza: number) {
  const owner: (string | null)[] = Array(plaza).fill('plaza');
  for (const p of projects) {
    // Line projects up so two squares sit side by side and three or more
    // fill a square of squares.
    const align = p.squares >= 3 ? 4 : p.squares;
    while (owner.length % align) owner.push(null);
    for (let i = 0; i < p.squares; i++) owner.push(p.id);
  }
  return owner;
}

/** From a square's middle to a lot's. */
const LOT_AT = BLOCK / 4 + 0.5;

/**
 * Lots in a square, back first: the busiest building stands at the back.
 * The front corner, toward the usual view, is left as a garden.
 */
export const LOTS = [
  { dx: -LOT_AT, dz: -LOT_AT, angle: Math.PI },
  { dx: LOT_AT, dz: -LOT_AT, angle: Math.PI },
  { dx: -LOT_AT, dz: LOT_AT, angle: 0 },
];
/** The garden corner of a square. */
export const GARDEN = { dx: LOT_AT, dz: LOT_AT };

/** One person's plot on the town square. */
export const PLOT = 8;
const PLOT_PITCH = PLOT + 1.5;
/** The town hall's middle, in from the square's back corner. */
export const HALL_IN = 9;
/** From the town hall to its yard, out front. */
const YARD_OUT = 7;

/** Half the width of a town square `size` squares across. */
const plazaHalf = (size: number) => (startOf(size - 1) + BLOCK - EDGE) / 2;

/**
 * The plots on a town square, from its middle, nearest the middle first and
 * the front before the back. They keep clear of the flags, trees and boards
 * round the edge, the logo in the middle, and the town hall and its yard.
 */
function plotsOn(half: number) {
  const r = PLOT / 2;
  const reach = half - 3.6 - r;
  const n = Math.floor((reach * 2) / PLOT_PITCH) + 1;
  const hall = -half + HALL_IN;
  const yard = hall + YARD_OUT;
  // How far a point is from the plot at (x, z).
  const gap = (x: number, z: number, px: number, pz: number) =>
    Math.hypot(
      Math.max(0, Math.abs(px - x) - r),
      Math.max(0, Math.abs(pz - z) - r),
    );
  const spots: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * PLOT_PITCH;
      const z = (j - (n - 1) / 2) * PLOT_PITCH;
      if (Math.abs(x - hall) < 4 + r && Math.abs(z - hall) < 4 + r) continue;
      if (gap(x, z, 0, 0) < 4.2) continue;
      if (gap(x, z, yard, yard) < 2.5) continue;
      spots.push({ x, z });
    }
  return spots.sort(
    (a, b) =>
      Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || b.x + b.z - (a.x + a.z),
  );
}

/** From a plot's middle, across (u) and toward the usual view (v). */
const onPlot = (plot: { x: number; z: number }, u: number, v: number) => ({
  x: plot.x + (u + v) / Math.SQRT2,
  z: plot.z + (v - u) / Math.SQRT2,
});

/** Where its person stands: at the back of the plot, facing the view. */
export const plotHome = (plot: { x: number; z: number }): Spot => ({
  ...onPlot(plot, 0, -2.8),
  angle: Math.PI / 4,
});

/**
 * Where its person's bots stand to report: a row across the plot just in
 * front of them, then one out front, far enough apart across the view that
 * their tags don't overlap, and none right in front of their person.
 */
const BOT_SPOTS = [
  [-1.5, 0],
  [1.5, 0],
  [-4, 0.3],
  [4, 0.3],
  [0, 3],
];

/** Where the `i`-th bot to come back stands on the plot. */
export function plotSpot(plot: { x: number; z: number }, i: number) {
  if (i < BOT_SPOTS.length) {
    const [u, v] = BOT_SPOTS[i];
    return onPlot(plot, u, v);
  }
  // Any more line up out front.
  const j = i - BOT_SPOTS.length;
  return onPlot(plot, (j % 2 ? 1 : -1) * 2.8, 3 + Math.floor(j / 2) * 2.8);
}

function layoutTown(world: World, townId: string) {
  const projects = world.projects
    .filter((p) => p.townId === townId)
    .sort((a, b) => a.rank - b.rank);
  // The square grows until everyone in the town has a plot.
  const crowd = world.people.filter((p) => p.townIds.includes(townId)).length;
  let size = 2;
  while (plotsOn(plazaHalf(size)).length < crowd) size *= 2;
  const owner = plan(
    projects.map((p) => ({
      id: p.id,
      squares: squaresFor(p.sites.reduce((n, s) => n + siteLots(s), 0)),
    })),
    size * size,
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
  const plazaFar = startOf(size - 1) + BLOCK;
  const plaza = {
    x: toX((EDGE + plazaFar) / 2),
    z: toZ((EDGE + plazaFar) / 2),
    half: plazaHalf(size),
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
    plots: plotsOn(plaza.half),
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
  // Each site's lots, oldest building first; the site itself is placed at
  // its newest building, where bots work.
  const sites = new Map<string, Spot & { projectId: string; lots: Spot[] }>();
  const people = new Map<string, Spot>();
  const plots = new Map<string, { x: number; z: number }>();

  world.towns.forEach((t, i) => {
    const x = ((i % cols) - (cols - 1) / 2) * spacing;
    const z = (Math.floor(i / cols) - (rows - 1) / 2) * spacing;
    const p = plans[i];
    const cells = p.cells.map((c) => ({ ...c, x: x + c.x, z: z + c.z }));
    const plaza = { ...p.plaza, x: x + p.plaza.x, z: z + p.plaza.z };
    const yard = -plaza.half + HALL_IN + YARD_OUT;
    towns.set(t.id, {
      yard: { x: plaza.x + yard, z: plaza.z + yard },
      x,
      z,
      minX: x + p.minX,
      maxX: x + p.maxX,
      minZ: z + p.minZ,
      maxZ: z + p.maxZ,
      plaza,
      cells,
      streetsX: p.streetsX.map((s) => ({ ...s, at: x + s.at, open: true })),
      streetsZ: p.streetsZ.map((s) => ({ ...s, at: z + s.at, open: true })),
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
      // Busiest buildings in the back squares, three to a square.
      const ordered = [...mine].sort((a, b) => a.x + a.z - (b.x + b.z));
      let k = 0;
      for (const site of project.sites) {
        const spots: Spot[] = [];
        for (let n = siteLots(site); n > 0; n--, k++) {
          const cell = ordered[Math.floor(k / LOTS_PER_SQUARE)];
          const lot = LOTS[k % LOTS_PER_SQUARE];
          if (cell)
            spots.push({
              x: cell.x + lot.dx,
              z: cell.z + lot.dz,
              angle: lot.angle,
            });
        }
        const newest = spots[spots.length - 1];
        if (newest)
          sites.set(site.id, { ...newest, projectId: project.id, lots: spots });
      }
    }

    // Roads under the town square or a project's ground are paved over.
    const spot = towns.get(t.id)!;
    const covers: Area[] = [
      {
        ...plaza,
        minX: plaza.x - plaza.half,
        maxX: plaza.x + plaza.half,
        minZ: plaza.z - plaza.half,
        maxZ: plaza.z + plaza.half,
      },
      ...p.projects.map((project) => projects.get(project.id)!),
    ];
    for (const street of spot.streetsX)
      street.open = !covers.some(
        (c) => street.at > c.minX + 0.5 && street.at < c.maxX - 0.5,
      );
    for (const street of spot.streetsZ)
      street.open = !covers.some(
        (c) => street.at > c.minZ + 0.5 && street.at < c.maxZ - 0.5,
      );

    const here = world.people.filter((person) => person.townIds.includes(t.id));
    here.forEach((person, j) => {
      const at = p.plots[j];
      if (!at) return;
      const plot = { x: plaza.x + at.x, z: plaza.z + at.z };
      plots.set(`${t.id}:${person.id}`, plot);
      people.set(`${t.id}:${person.id}`, plotHome(plot));
    });
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
    /** Each person's plot on each of their town squares. */
    plots,
    roads,
    spacing,
    cols,
    rows,
    /** How wide the whole world is, edge to edge. */
    extent: Math.max(cols, rows) * spacing,
  };
}

/**
 * The way along the roads from `a` to `b` in a town: on foot out to the
 * nearest open road, along it, across on a cross road, and in again.
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
  const open = (lines: Street[]) => {
    const out = lines.filter((l) => l.open);
    return out.length ? out : lines;
  };
  const streetsX = open(town.streetsX);
  const streetsZ = open(town.streetsZ);
  const za = nearest(streetsZ, a.z);
  const zb = nearest(streetsZ, b.z);
  const points = [
    { x: a.x, z: a.z },
    { x: a.x, z: za },
  ];
  if (Math.abs(za - zb) < 0.01) points.push({ x: b.x, z: za });
  else {
    const xv = nearest(streetsX, (a.x + b.x) / 2);
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
