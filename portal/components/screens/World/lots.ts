import * as THREE from 'three';

import type { WorldHouse, WorldSite } from '@/lib/world/state';
import { candyOf, FLOORS, goalTowers } from '@/lib/world/state';

import type { Animated } from './art';
import {
  block,
  CLAY,
  clay,
  CLAY_SHADE,
  cylinder,
  glow,
  INK,
  mesh,
  prism,
  roundBox,
  shade,
  shape,
  sphere,
  tint,
  torus,
} from './art';

/*
 * What stands on a project's lots, in bright colours: a repeating goal's
 * buildings (a floor per task, a new building every ten floors, cracked
 * when the last period was missed), a target's record tower, and the week's
 * small houses for tasks that are for no goal. Also the tools bots work
 * with, the rewards that pop up when something is done, and the curved
 * roads.
 */

/** One floor of a goal building, in world units. */
const FLOOR_H = 0.82;
const GROUND_H = 1.3;
const GOLD = '#f5b301';
const gold = () => clay(GOLD, { metal: 0.5, rough: 0.35 });
const WOOD = '#d6b07c';

/** Where a goal's buildings stand on its lot: oldest at the back. */
const TOWER_SPOTS: [number, number, number][][] = [
  [],
  [[0, 0, 5]],
  [
    [-2.1, -1.2, 3.8],
    [2.1, 1.2, 3.8],
  ],
  [
    [-2.3, -2.3, 3.4],
    [2.3, -2.3, 3.4],
    [0, 2.3, 3.4],
  ],
  [
    [-2.3, -2.3, 3.4],
    [2.3, -2.3, 3.4],
    [-2.3, 2.3, 3.4],
    [2.3, 2.3, 3.4],
  ],
];

/** A goal building: a ground floor and `floors` coloured floors. */
function tower(
  g: THREE.Object3D,
  floors: number,
  w: number,
  hex: string,
  accent: string,
  opts: { growing: boolean; broken: boolean; seed: number },
  anims: Animated[],
) {
  const t = new THREE.Group();
  g.add(t);
  const body = opts.broken ? shade(tint(hex, 0.35), 0.25) : hex;
  const glass = opts.broken ? '#cbd5e1' : tint(hex, 0.78);
  block(t, w + 0.7, 0.25, w + 0.7, CLAY, 0, 0, 0, 0.12);
  if (floors <= 0) {
    // Just started: a slab and scaffolding.
    block(t, w, 0.4, w, CLAY_SHADE, 0, 0.25, 0, 0.08);
    scaffold(t, w, 0.65, 2, accent);
    return { group: t, top: 2.8 };
  }
  // The ground floor: white, with a coloured door and awning.
  block(t, w, GROUND_H, w, CLAY, 0, 0.25, 0, 0.14);
  block(t, w * 0.36, 0.85, 0.1, shade(body, 0.15), 0, 0.25, w / 2, 0.03);
  block(t, w * 0.55, 0.12, 0.55, body, 0, 1.15, w / 2 + 0.2, 0.04);
  let y = 0.25 + GROUND_H;
  for (let i = 0; i < floors; i++) {
    block(t, w, FLOOR_H, w, body, 0, y, 0, 0.1);
    // A band of windows round each floor.
    block(t, w + 0.06, FLOOR_H * 0.42, w + 0.06, glass, 0, y + 0.2, 0, 0.04);
    y += FLOOR_H;
  }
  if (!opts.growing) {
    // Finished: a roof with a rim, a water tank and a star.
    block(t, w + 0.25, 0.3, w + 0.25, CLAY, 0, y, 0, 0.1);
    block(t, w + 0.3, 0.12, w + 0.3, accent, 0, y + 0.3, 0, 0.04);
    mesh(
      t,
      cylinder(0.45, 0.45, 0.7, 16),
      clay(CLAY),
      -w * 0.22,
      y + 0.77,
      -w * 0.2,
    );
    mesh(t, sphere(0.45, 16, true), clay(body), -w * 0.22, y + 1.12, -w * 0.2);
    y += 0.42;
    if (floors >= FLOORS && !opts.broken) {
      const star = mesh(t, starShape(0.42), gold(), w * 0.2, y + 0.75, w * 0.2);
      anims.push((tt) => (star.rotation.y = tt * 1.2 + opts.seed));
      y += 1.3;
    }
  } else {
    // Going up: scaffolding for the next floor.
    scaffold(t, w, y, FLOOR_H * 1.4, accent);
    y += FLOOR_H * 1.4;
  }
  if (opts.broken) {
    // Missed: it leans, cracks and drops bits of itself.
    t.rotation.z = 0.09;
    t.rotation.x = -0.05;
    const crack = clay('#334155');
    const face = w / 2 + 0.06;
    // A zigzag crack down the front and down one side.
    for (const side of [0, 1]) {
      let cx = side ? w * 0.1 : -w * 0.15;
      for (let cy = y - 0.4; cy > 0.9; cy -= 0.55) {
        const nx = cx + (Math.round(cy * 10) % 2 ? 0.35 : -0.35);
        const seg = block(t, 0.12, 0.64, 0.06, '#334155', 0, cy - 0.6, 0, 0.01);
        seg.material = crack;
        if (side) {
          seg.position.set(face, cy - 0.3, (cx + nx) / 2);
          seg.rotation.set(Math.atan2(nx - cx, 0.55), Math.PI / 2, 0);
        } else {
          seg.position.set((cx + nx) / 2, cy - 0.3, face);
          seg.rotation.z = Math.atan2(nx - cx, 0.55);
        }
        cx = nx;
      }
    }
    for (const [x, z, s] of [
      [w * 0.6, w * 0.45, 0.5],
      [w * 0.75, -w * 0.1, 0.35],
      [-w * 0.55, w * 0.62, 0.4],
    ])
      block(g, s, s * 0.7, s, shade(body, 0.1), x, 0, z, 0.06).rotation.y = x;
  }
  return { group: t, top: y };
}

/** Thin poles and planks round a floor going up. */
function scaffold(
  g: THREE.Object3D,
  w: number,
  from: number,
  h: number,
  accent: string,
) {
  const pole = clay(WOOD);
  const d = w / 2 + 0.15;
  for (const [x, z] of [
    [-d, -d],
    [d, -d],
    [-d, d],
    [d, d],
  ])
    mesh(g, roundBox(0.1, h, 0.1, 0.02), pole, x, from + h / 2, z);
  for (const y of [from + h * 0.45, from + h])
    for (const [bw, bd, x, z] of [
      [w + 0.4, 0.08, 0, -d],
      [w + 0.4, 0.08, 0, d],
      [0.08, w + 0.4, -d, 0],
      [0.08, w + 0.4, d, 0],
    ])
      mesh(g, roundBox(bw, 0.08, bd, 0.02), pole, x, y, z);
  // A safety net on the front.
  block(
    g,
    w * 0.7,
    h * 0.5,
    0.04,
    tint(accent, 0.5),
    0,
    from + h * 0.2,
    d,
    0.01,
  );
}

const starShape = (r: number) =>
  shape(`bigstar${r}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 ? r * 0.45 : r;
      if (i) s.lineTo(Math.cos(a) * k, Math.sin(a) * k);
      else s.moveTo(Math.cos(a) * k, Math.sin(a) * k);
    }
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: r * 0.3,
      bevelEnabled: true,
      bevelSize: r * 0.06,
      bevelThickness: r * 0.06,
      bevelSegments: 2,
    });
    geo.center();
    return geo;
  });

/**
 * A repeating goal's lot: its last four buildings, the newest at the front
 * where bots work on it. Returns where the newest one's top is.
 */
export function goalLot(site: WorldSite, accent: string) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  const { full, rest, total } = goalTowers(site.done);
  const shown = Math.min(total, 4);
  const first = total - shown;
  let height = 0;
  let top = { x: 0, y: 4, z: 0 };
  TOWER_SPOTS[shown].forEach(([x, z, w], i) => {
    const index = first + i;
    const latest = i === shown - 1;
    const floors = index < full ? FLOORS : rest;
    const made = tower(
      g,
      floors,
      w,
      // Older buildings a little paler.
      latest ? site.color : tint(site.color, 0.25 + (shown - 1 - i) * 0.08),
      accent,
      {
        growing: latest && floors < FLOORS,
        broken: latest && !!site.missed,
        seed: index,
      },
      anims,
    );
    made.group.position.set(x, 0, z);
    height = Math.max(height, made.top);
    if (latest) top = { x, y: made.top, z };
  });
  // Flowers along the front of a goal on a streak.
  if ((site.streak ?? 0) >= 2)
    for (let i = 0; i < Math.min(site.streak!, 6); i++)
      mesh(
        g,
        sphere(0.22, 10),
        clay(['#f472b6', '#facc15', '#fb7185'][i % 3]),
        -3.6 + i * 1.4,
        0.25,
        4.3,
      );
  return { group: g, anims, height, top };
}

/**
 * A target's record tower: as tall as it is near its number, under a gold
 * ring at the height it is going for, on a plinth for each target reached
 * before it. Reached, it wears a turning trophy.
 */
export function recordTower(site: WorldSite) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  const records = (site.records ?? []).slice(-4);
  let y = 0;
  records.forEach((_, i) => {
    const r = 4.3 - i * 0.45;
    mesh(g, cylinder(r, r + 0.1, 0.45, 40), clay(CLAY), 0, y + 0.225, 0);
    // A gold band round its side, below the top so they never overlap.
    mesh(g, cylinder(r + 0.03, r + 0.13, 0.14, 40), gold(), 0, y + 0.22, 0);
    y += 0.45;
  });
  if (!records.length) {
    mesh(g, cylinder(3.4, 3.6, 0.35, 40), clay(CLAY), 0, 0.175, 0);
    y = 0.35;
  }
  const full = 12;
  const k = Math.max(0.06, Math.min(1, (site.percent ?? 0) / 100));
  const h = full * k;
  const body = clay(site.color, { rough: 0.35, metal: 0.15 });
  mesh(g, cylinder(1.9, 2.2, h, 8), body, 0, y + h / 2, 0);
  for (let b = 1; b < h; b += 1.1)
    mesh(
      g,
      cylinder(1.93, 2.24 - (b / h) * 0.3, 0.3, 8),
      clay(tint(site.color, 0.75)),
      0,
      y + b,
      0,
    );
  // Where it is going: a faint outline to the top and a gold ring there.
  const ghost = new THREE.Mesh(
    cylinder(1.9, 2.2, full, 8),
    new THREE.MeshBasicMaterial({
      color: site.color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  ghost.position.y = y + full / 2;
  g.add(ghost);
  const top = y + (site.achieved ? h : full);
  if (site.achieved) {
    const cup = trophy();
    cup.position.y = y + h;
    g.add(cup);
    anims.push((t) => (cup.rotation.y = t * 0.8));
  } else {
    const ring = mesh(g, torus(2.5, 0.12, Math.PI * 2, 40), gold(), 0, top, 0);
    ring.rotation.x = Math.PI / 2;
    anims.push((t) => (ring.position.y = top + Math.sin(t * 1.5) * 0.15));
  }
  return {
    group: g,
    anims,
    height: top + (site.achieved ? 3 : 1),
    top: { x: 0, y: y + h, z: 0 },
  };
}

/** A gold cup on a stand. */
export function trophy(scale = 1) {
  const g = new THREE.Group();
  const m = gold();
  mesh(g, cylinder(0.7, 0.8, 0.3, 20), clay(INK), 0, 0.15, 0);
  mesh(g, cylinder(0.12, 0.2, 0.7, 12), m, 0, 0.65, 0);
  mesh(g, cylinder(0.75, 0.3, 1, 24), m, 0, 1.5, 0);
  for (const x of [-0.75, 0.75]) {
    const handle = mesh(g, torus(0.3, 0.07, Math.PI, 12), m, x, 1.55, 0);
    handle.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  g.scale.setScalar(scale);
  return g;
}

/** Where a house stands on a homes lot. */
export const HOUSE_SPOTS = [
  [-2.4, -2.4],
  [2.4, -2.4],
  [-2.4, 2.4],
  [2.4, 2.4],
];

/** A small house: done, with its roof on; open, still being framed. */
function house(h: WorldHouse) {
  const g = new THREE.Group();
  const hex = candyOf(h.id);
  const w = h.major ? 3.4 : 2.8;
  const d = h.major ? 3 : 2.5;
  const wall = h.major ? 2.4 : 1.5;
  block(g, w + 0.5, 0.2, d + 0.5, CLAY_SHADE, 0, 0, 0, 0.08);
  if (h.done) {
    block(g, w, wall, d, tint(hex, 0.82), 0, 0.2, 0, 0.1);
    const roof = mesh(
      g,
      prism(d + 0.4, 1.1, w + 0.4),
      clay(hex),
      0,
      0.2 + wall,
      0,
    );
    roof.rotation.y = Math.PI / 2;
    block(g, 0.6, 1, 0.08, shade(hex, 0.25), -w * 0.18, 0.2, d / 2, 0.03);
    block(
      g,
      0.6,
      0.5,
      0.06,
      '#bfdbfe',
      w * 0.22,
      0.2 + wall * 0.45,
      d / 2,
      0.03,
    );
    if (h.major)
      block(
        g,
        0.6,
        0.5,
        0.06,
        '#bfdbfe',
        -w * 0.18,
        0.2 + wall * 0.68,
        d / 2,
        0.03,
      );
    block(
      g,
      0.35,
      0.8,
      0.35,
      CLAY,
      w * 0.25,
      0.2 + wall + 0.3,
      -d * 0.15,
      0.05,
    );
    return { group: g, top: 0.2 + wall + 1.3 };
  }
  // Being built: a frame of posts and beams, and the walls half up.
  block(g, w, wall * 0.4, d, tint(hex, 0.7), 0, 0.2, 0, 0.06);
  const post = clay(WOOD);
  for (const [x, z] of [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [w / 2, d / 2],
  ])
    mesh(g, roundBox(0.12, wall, 0.12, 0.02), post, x, 0.2 + wall / 2, z);
  for (const [bw, bd, x, z] of [
    [w, 0.1, 0, -d / 2],
    [w, 0.1, 0, d / 2],
    [0.1, d, -w / 2, 0],
    [0.1, d, w / 2, 0],
  ])
    mesh(g, roundBox(bw, 0.1, bd, 0.02), post, x, 0.2 + wall, z);
  // A traffic cone out front.
  mesh(
    g,
    cylinder(0.02, 0.2, 0.5, 10),
    clay('#f97316'),
    w / 2 + 0.3,
    0.45,
    d / 2 + 0.3,
  );
  return { group: g, top: 0.2 + wall + 0.4 };
}

/** A homes lot: this week's tasks for no goal, as houses. */
export function homesLot(site: WorldSite) {
  const g = new THREE.Group();
  const houses = new Map<string, { x: number; z: number; top: number }>();
  let height = 0;
  (site.houses ?? []).forEach((h, i) => {
    const [x, z] = HOUSE_SPOTS[i] ?? HOUSE_SPOTS[0];
    const made = house(h);
    made.group.position.set(x, 0, z);
    made.group.rotation.y = ((i % 2 ? 1 : -1) * Math.PI) / 18;
    g.add(made.group);
    houses.set(h.id, { x, z, top: made.top });
    height = Math.max(height, made.top);
  });
  // A little path between them.
  block(g, 0.9, 0.04, 9, '#ffffff', 0, 0.02, 0, 0.02);
  block(g, 9, 0.04, 0.9, '#ffffff', 0, 0.02, 0, 0.02);
  return { group: g, anims: [] as Animated[], height, houses };
}

/* -------------------------------- tools --------------------------------- */

/** A tower crane a bot works on big tasks with; it turns and lifts. */
export function crane(seed: number) {
  const g = new THREE.Group();
  const yellow = clay('#facc15');
  block(g, 1.4, 0.4, 1.4, '#475569', 0, 0, 0, 0.06);
  for (let y = 0.4; y < 9; y += 1.2) {
    block(g, 0.5, 1.15, 0.5, '#facc15', 0, y, 0, 0.03);
    mesh(
      g,
      roundBox(0.56, 0.08, 0.56, 0.01),
      clay(shade('#facc15', 0.2)),
      0,
      y + 1.15,
      0,
    );
  }
  const jib = new THREE.Group();
  jib.position.y = 9.4;
  g.add(jib);
  mesh(jib, roundBox(7, 0.35, 0.35, 0.04), yellow, -2.2, 0, 0);
  block(jib, 1, 0.8, 0.8, '#475569', 1.6, -0.4, 0, 0.08);
  block(jib, 0.8, 0.7, 0.7, CLAY, 0.3, -0.75, 0, 0.1);
  const cable = mesh(jib, cylinder(0.025, 0.025, 1, 4), clay(INK), -4.8, 0, 0);
  const hook = new THREE.Group();
  jib.add(hook);
  block(hook, 0.7, 0.5, 0.7, '#f97316', 0, 0, 0, 0.06);
  const anim: Animated = (t) => {
    jib.rotation.y = Math.sin(t * 0.35 + seed) * 1.1;
    const drop = 2.5 + Math.sin(t * 0.9 + seed) * 2;
    cable.scale.y = drop;
    cable.position.set(-4.8, -drop / 2, 0);
    hook.position.set(-4.8, -drop - 0.5, 0);
  };
  return { group: g, anim };
}

/** A hammer for a bot's hand. */
export function hammer() {
  const g = new THREE.Group();
  mesh(g, cylinder(0.04, 0.045, 0.6, 8), clay(WOOD), 0, -0.3, 0);
  block(g, 0.34, 0.16, 0.16, '#64748b', 0, -0.68, 0, 0.03).rotation.y =
    Math.PI / 2;
  g.traverse((o) => (o.castShadow = false));
  return g;
}

/* ------------------------------- rewards -------------------------------- */

export type Effect = {
  group: THREE.Object3D;
  /** Moves it on; false once it is over and can be removed. */
  step: (dt: number) => boolean;
};

const fading = (hex: string, opts: { metal?: number } = {}) =>
  new THREE.MeshStandardMaterial({
    color: hex,
    metalness: opts.metal ?? 0.5,
    roughness: 0.35,
    emissive: hex,
    emissiveIntensity: 0.35,
    transparent: true,
  });

/**
 * A reward that pops up over a building and floats away: a star for a
 * goal's task, a trophy for a target reached, a coin for anything else.
 */
export function reward(
  kind: 'star' | 'trophy' | 'coin',
  at: { x: number; y: number; z: number },
): Effect {
  const g = new THREE.Group();
  g.position.set(at.x, at.y + 0.5, at.z);
  const m = fading(GOLD);
  if (kind === 'trophy') {
    const cup = trophy(1.2);
    cup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = m;
    });
    g.add(cup);
  } else if (kind === 'coin') {
    const coin = new THREE.Mesh(cylinder(0.8, 0.8, 0.18, 28), m);
    coin.rotation.x = Math.PI / 2;
    g.add(coin);
  } else g.add(new THREE.Mesh(starShape(0.95), m));
  // A burst of confetti.
  const bits = Array.from({ length: 14 }, (_, i) => {
    const bit = new THREE.Mesh(
      roundBox(0.18, 0.18, 0.05, 0.02),
      fading(['#f472b6', '#60a5fa', '#34d399', '#facc15'][i % 4], { metal: 0 }),
    );
    const a = (i / 14) * Math.PI * 2;
    bit.userData.v = new THREE.Vector3(
      Math.cos(a) * 3,
      4 + (i % 3),
      Math.sin(a) * 3,
    );
    g.add(bit);
    return bit;
  });
  const ring = new THREE.Mesh(
    shape('rewardRing', () => {
      const geo = new THREE.RingGeometry(0.8, 1, 48);
      geo.rotateX(-Math.PI / 2);
      return geo;
    }),
    glow(GOLD, 0.9).clone(),
  );
  g.add(ring);
  let age = 0;
  const life = 2.6;
  return {
    group: g,
    step: (dt) => {
      age += dt;
      const k = age / life;
      // Pops in, rises and turns, then fades.
      const pop =
        age < 0.35
          ? (age / 0.35) * 1.25
          : age < 0.55
            ? 1.25 - ((age - 0.35) / 0.2) * 0.25
            : 1;
      const main = g.children[0];
      main.scale.setScalar(pop * 1.9);
      main.position.y = k * 3;
      main.rotation.y = age * 4;
      m.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
      ring.scale.setScalar(1 + age * 5);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.9 - age * 1.2,
      );
      for (const bit of bits) {
        const v = bit.userData.v as THREE.Vector3;
        v.y -= dt * 9;
        bit.position.addScaledVector(v, dt);
        bit.rotation.x += dt * 8;
        bit.rotation.z += dt * 6;
        (bit.material as THREE.MeshStandardMaterial).opacity = Math.max(
          0,
          1 - k * 1.6,
        );
      }
      return age < life;
    },
  };
}

/** A building squashes and springs back up when it levels up. */
export function bounce(o: THREE.Object3D): Effect {
  let age = 0;
  return {
    group: new THREE.Group(),
    step: (dt) => {
      age += dt;
      const s =
        1 +
        Math.sin(Math.min(age, 0.8) * Math.PI * 2.5) *
          0.12 *
          Math.max(0, 1 - age / 0.8);
      o.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      if (age >= 0.8) o.scale.set(1, 1, 1);
      return age < 0.8;
    },
  };
}

/* -------------------------------- roads --------------------------------- */

type Point = { x: number; z: number };

/** Rounds every corner of a path into a curve of radius about `r`. */
export function smooth(points: Point[], r = 2.6) {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const ab = Math.hypot(b.x - a.x, b.z - a.z);
    const bc = Math.hypot(c.x - b.x, c.z - b.z);
    const k = Math.min(r, ab / 2, bc / 2);
    if (k < 0.05) {
      out.push(b);
      continue;
    }
    const p0 = {
      x: b.x + ((a.x - b.x) / ab) * k,
      z: b.z + ((a.z - b.z) / ab) * k,
    };
    const p2 = {
      x: b.x + ((c.x - b.x) / bc) * k,
      z: b.z + ((c.z - b.z) / bc) * k,
    };
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const u = 1 - t;
      out.push({
        x: u * u * p0.x + 2 * u * t * b.x + t * t * p2.x,
        z: u * u * p0.z + 2 * u * t * b.z + t * t * p2.z,
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** A gentle S-bend from `a` to `b`, so highways curve between towns. */
export function bend(a: Point, b: Point, amp: number) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const nx = -(b.z - a.z) / (len || 1);
  const nz = (b.x - a.x) / (len || 1);
  const steps = Math.max(8, Math.ceil(len / 2));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    // Straight where it meets a town, curving in between.
    const off = Math.sin(t * Math.PI * 2) * amp * Math.sin(t * Math.PI);
    return {
      x: a.x + (b.x - a.x) * t + nx * off,
      z: a.z + (b.z - a.z) * t + nz * off,
    };
  });
}

/** A flat band `width` wide along a path, on the ground at `y`. */
export function ribbon(points: Point[], width: number, hex: string, y: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = (-(b.z - a.z) / len) * (width / 2);
    const nz = ((b.x - a.x) / len) * (width / 2);
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    if (i) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Faces may point down depending on the winding: draw both sides.
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  m.receiveShadow = true;
  return m;
}

/** A rounded rectangle lying on the ground. */
export function plate(w: number, d: number, r: number, hex: string, y: number) {
  const geo = shape(`plate${w.toFixed(2)},${d.toFixed(2)},${r}`, () => {
    const s = new THREE.Shape();
    const x0 = -w / 2;
    const z0 = -d / 2;
    const k = Math.min(r, w / 2, d / 2);
    s.moveTo(x0 + k, z0);
    s.lineTo(x0 + w - k, z0);
    s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + k);
    s.lineTo(x0 + w, z0 + d - k);
    s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - k, z0 + d);
    s.lineTo(x0 + k, z0 + d);
    s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - k);
    s.lineTo(x0, z0 + k);
    s.quadraticCurveTo(x0, z0, x0 + k, z0);
    const g = new THREE.ShapeGeometry(s, 8);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
