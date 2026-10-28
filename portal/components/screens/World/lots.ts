import * as THREE from 'three';

import type { WorldHouse, WorldSite } from '@/lib/world/state';
import { FLOORS, goalTowers } from '@/lib/world/state';

import type { Animated, BuildingKind } from './art';
import {
  block,
  building,
  CLAY,
  clay,
  CLAY_SHADE,
  construction,
  cylinder,
  glow,
  hash,
  INK,
  mesh,
  prism,
  roundBox,
  shade,
  shape,
  tint,
  torus,
} from './art';

/*
 * What stands on a project's lots, in the world's own look (white clay and
 * the town's brand colour): a repeating goal's buildings, which gain a
 * floor per task and start a new one every ten floors (and lean and crack
 * when the last period was missed); a target's record tower, a tiered glass
 * skyscraper that rises toward its number; and the week's small houses for
 * tasks that are for no goal. Also the tools bots work with, the rewards
 * that pop up when something is done.
 */

/** One floor of a goal building, in world units. */
const FLOOR_H = 0.62;
const GOLD = '#f5b301';
const gold = () => clay(GOLD, { metal: 0.6, rough: 0.3 });
const WOOD = '#c8a77a';

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

/** How big a goal building stands on its lot. */
const GOAL_SCALE = 0.85;

/** The looks a goal's buildings take, in turn. */
const KINDS: BuildingKind[] = ['tower', 'factory', 'silos', 'lab', 'warehouse'];

/** Thin poles and planks round a floor going up. */
function scaffold(
  g: THREE.Object3D,
  w: number,
  from: number,
  h: number,
  accent: string,
) {
  const pole = clay(tint(accent, 0.25));
  const d = w / 2;
  for (const [x, z] of [
    [-d, -d],
    [d, -d],
    [-d, d],
    [d, d],
  ])
    mesh(g, roundBox(0.1, h, 0.1, 0.02), pole, x, from + h / 2, z);
  for (const y of [from + h * 0.5, from + h])
    for (const [bw, bd, x, z] of [
      [w, 0.08, 0, -d],
      [w, 0.08, 0, d],
      [0.08, w, -d, 0],
      [0.08, w, d, 0],
    ])
      mesh(g, roundBox(bw, 0.08, bd, 0.02), clay(CLAY_SHADE), x, y, z);
}

/**
 * One goal building: the world's own buildings, as tall as its floors.
 * The newest grows scaffolding while it goes up; a missed period leaves it
 * leaning, cracked and dropping bits of itself.
 */
function goalBuilding(
  kind: BuildingKind,
  floors: number,
  scale: number,
  accent: string,
  sign: THREE.Material,
  opts: { growing: boolean; broken: boolean; seed: number },
) {
  const g = new THREE.Group();
  if (floors <= 0) {
    const made = construction(accent, opts.seed);
    made.group.scale.setScalar(scale * 1.25);
    g.add(made.group);
    return { group: g, anims: made.anims, top: 7.5 * scale * 1.25 };
  }
  const height = 2.2 + floors * FLOOR_H;
  const made = building(kind, height / scale, accent, sign, opts.seed);
  made.group.scale.setScalar(scale);
  g.add(made.group);
  let top = new THREE.Box3().setFromObject(g).max.y;
  if (opts.growing) {
    scaffold(g, 8.4 * scale * 0.8, top - FLOOR_H, FLOOR_H * 1.6, accent);
    top += FLOOR_H * 0.6;
  }
  if (opts.broken) {
    g.rotation.z = 0.07;
    g.rotation.x = -0.04;
    const crack = clay('#475569');
    const w = 8.4 * scale * 0.72;
    for (const side of [0, 1]) {
      let cx = side ? w * 0.1 : -w * 0.12;
      for (let y = top - 0.6; y > 1; y -= 0.6) {
        const nx = cx + (Math.round(y * 10) % 2 ? 0.3 : -0.3);
        const seg = mesh(g, roundBox(0.09, 0.66, 0.05, 0.01), crack);
        if (side) {
          seg.position.set(w / 2 + 0.05, y - 0.3, (cx + nx) / 2);
          seg.rotation.set(Math.atan2(nx - cx, 0.6), Math.PI / 2, 0);
        } else {
          seg.position.set((cx + nx) / 2, y - 0.3, w / 2 + 0.05);
          seg.rotation.z = Math.atan2(nx - cx, 0.6);
        }
        cx = nx;
      }
    }
  }
  return { group: g, anims: made.anims, top };
}

/**
 * One of a repeating goal's lots: its `index`-th building, each on a lot
 * of its own. The newest is the one going up, where bots work on it.
 */
export function goalLot(
  site: WorldSite,
  index: number,
  accent: string,
  sign: THREE.Material,
) {
  const g = new THREE.Group();
  const { full, rest, total } = goalTowers(site.done);
  const latest = index === total - 1;
  const floors = index < full ? FLOORS : rest;
  const made = goalBuilding(
    KINDS[(hash(site.id) + index) % KINDS.length],
    floors,
    GOAL_SCALE,
    accent,
    sign,
    {
      growing: latest && floors < FLOORS,
      broken: latest && !!site.missed,
      seed: index + (hash(site.id) % 10),
    },
  );
  g.add(made.group);
  if (latest && site.missed)
    for (const [x, z, s] of [
      [3.9, 3.6, 0.5],
      [2.9, 4.4, 0.35],
      [4.4, 2.4, 0.4],
    ])
      block(g, s, s * 0.6, s, CLAY_SHADE, x, 0, z, 0.06).rotation.y = x;
  return {
    group: g,
    anims: made.anims,
    height: made.top,
    top: { x: 0, y: made.top, z: 0 },
  };
}

const glasses = new Map<string, THREE.MeshStandardMaterial>();
/**
 * Curtain-wall glass in the brand colour: panes in a fine white grid, a
 * little lighter toward the top of each pane, like the sky in them.
 */
function glassOf(accent: string) {
  let m = glasses.get(accent);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const panes = 4;
  const size = 128 / panes;
  for (let i = 0; i < panes; i++)
    for (let j = 0; j < panes; j++) {
      const grad = ctx.createLinearGradient(0, j * size, 0, (j + 1) * size);
      grad.addColorStop(0, tint(accent, 0.45));
      grad.addColorStop(1, tint(accent, 0.05));
      ctx.fillStyle = grad;
      ctx.fillRect(i * size, j * size, size, size);
    }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  for (let k = 0; k <= panes; k++) {
    ctx.beginPath();
    ctx.moveTo(k * size, 0);
    ctx.lineTo(k * size, 128);
    ctx.moveTo(0, k * size);
    ctx.lineTo(128, k * size);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 1);
  m = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.2,
    metalness: 0.25,
  });
  glasses.set(accent, m);
  return m;
}

/**
 * A target's record tower: a tiered glass skyscraper in the brand colour,
 * built up to how near it is to its number, with the rest of it drawn in
 * outline above. Reached, it is whole, with a glowing spire. Every target
 * reached before is a step of its podium.
 */
export function recordTower(site: WorldSite, accent: string) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  const glass = glassOf(accent);
  const frame = clay('#ffffff', { rough: 0.5 });
  // The podium: a step for every record before this one.
  let y = 0;
  const steps = Math.max(1, Math.min(4, (site.records?.length ?? 0) + 1));
  for (let i = 0; i < steps; i++) {
    const w = 7.4 - i * 0.9;
    block(g, w, 0.45, w, i % 2 ? CLAY_SHADE : CLAY, 0, y, 0, 0.1);
    if (i < steps - 1 || steps > 1)
      block(g, w + 0.04, 0.08, w + 0.04, accent, 0, y + 0.3, 0, 0.02);
    y += 0.45;
  }
  // The shaft and its base.
  block(g, 3.4, 1.6, 3.4, CLAY, 0, y, 0, 0.12);
  for (const x of [-1.1, 0, 1.1])
    block(g, 0.5, 1.1, 0.06, accent, x, y, 1.72, 0.03);
  y += 1.6;
  // Eight tiers flaring outward, like the stacked boxes of a pagoda.
  const TIERS = 8;
  const tierH = 1.15;
  const built = site.achieved
    ? TIERS
    : Math.max(1, Math.floor((TIERS * (site.percent ?? 0)) / 100));
  const tier = shape('recordTier', () => {
    const geo = new THREE.CylinderGeometry(1.75, 1.35, tierH, 4, 1);
    geo.rotateY(Math.PI / 4);
    return geo;
  });
  const rim = shape('recordRim', () => {
    const geo = new THREE.CylinderGeometry(1.8, 1.8, 0.1, 4, 1);
    geo.rotateY(Math.PI / 4);
    return geo;
  });
  const outline = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.45,
  });
  const edges = shape('recordTierEdges', () => new THREE.EdgesGeometry(tier));
  let reached = y;
  for (let i = 0; i < TIERS; i++) {
    const at = y + i * tierH + tierH / 2;
    if (i < built) {
      const t = mesh(g, tier, glass, 0, at, 0);
      t.castShadow = true;
      mesh(g, rim, frame, 0, at + tierH / 2, 0);
      reached = at + tierH / 2;
    } else {
      const ghost = new THREE.LineSegments(edges, outline);
      ghost.position.set(0, at, 0);
      g.add(ghost);
    }
  }
  const crownAt = y + TIERS * tierH;
  if (site.achieved) {
    // The crown, a slim spire and a light at its tip.
    const cap = shape('recordCap', () => {
      const geo = new THREE.CylinderGeometry(0.75, 1.2, 1.4, 4, 1);
      geo.rotateY(Math.PI / 4);
      return geo;
    });
    mesh(g, cap, glass, 0, crownAt + 0.7, 0);
    mesh(g, cylinder(0.35, 0.5, 0.8, 16), frame, 0, crownAt + 1.8, 0);
    mesh(g, cylinder(0.04, 0.14, 3.2, 8), frame, 0, crownAt + 3.8, 0);
    const tip = mesh(
      g,
      cylinder(0.12, 0.12, 0.12, 10),
      clay(GOLD, { glow: 1.2 }),
      0,
      crownAt + 5.45,
      0,
    );
    anims.push((t) => tip.scale.setScalar(1 + Math.sin(t * 3) * 0.3));
    return {
      group: g,
      anims,
      height: crownAt + 5.6,
      top: { x: 0, y: crownAt + 5.6, z: 0 },
    };
  }
  // Where it is going: a thin gold ring at the top of the outline.
  const ring = mesh(
    g,
    torus(1.6, 0.05, Math.PI * 2, 48),
    gold(),
    0,
    crownAt,
    0,
  );
  ring.rotation.x = Math.PI / 2;
  anims.push((t) => (ring.rotation.z = t * 0.4));
  return {
    group: g,
    anims,
    height: crownAt + 0.6,
    top: { x: 0, y: reached, z: 0 },
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
  [-2.6, -2.4],
  [2.6, -2.4],
  [0, 2.6],
];

/**
 * A small house in white clay with a roof in the town's colour: done, it
 * is finished; open, it is still being framed.
 */
function house(h: WorldHouse, accent: string) {
  const g = new THREE.Group();
  const w = h.major ? 3.4 : 2.8;
  const d = h.major ? 3 : 2.5;
  const wall = h.major ? 2.3 : 1.5;
  block(g, w + 0.5, 0.2, d + 0.5, CLAY_SHADE, 0, 0, 0, 0.08);
  if (h.done) {
    block(g, w, wall, d, CLAY, 0, 0.2, 0, 0.1);
    const roof = mesh(
      g,
      prism(d + 0.4, 1, w + 0.4),
      clay(accent),
      0,
      0.2 + wall,
      0,
    );
    roof.rotation.y = Math.PI / 2;
    block(
      g,
      w + 0.45,
      0.1,
      d + 0.45,
      tint(accent, 0.3),
      0,
      0.2 + wall - 0.1,
      0,
      0.02,
    );
    block(g, 0.6, 1, 0.08, accent, -w * 0.18, 0.2, d / 2, 0.03);
    block(
      g,
      0.6,
      0.45,
      0.06,
      tint(accent, 0.12),
      w * 0.22,
      0.2 + wall * 0.45,
      d / 2,
      0.03,
    );
    if (h.major)
      block(
        g,
        0.6,
        0.45,
        0.06,
        tint(accent, 0.12),
        -w * 0.18,
        0.2 + wall * 0.7,
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
      0.2 + wall + 0.25,
      -d * 0.15,
      0.05,
    );
    return { group: g, top: 0.2 + wall + 1.2 };
  }
  // Being built: the walls half up inside scaffolding.
  block(g, w, wall * 0.45, d, CLAY, 0, 0.2, 0, 0.06);
  const pole = clay(tint(accent, 0.25));
  for (const [x, z] of [
    [-w / 2 - 0.1, -d / 2 - 0.1],
    [w / 2 + 0.1, -d / 2 - 0.1],
    [-w / 2 - 0.1, d / 2 + 0.1],
    [w / 2 + 0.1, d / 2 + 0.1],
  ])
    mesh(g, roundBox(0.1, wall, 0.1, 0.02), pole, x, 0.2 + wall / 2, z);
  for (const [bw, bd, x, z] of [
    [w + 0.2, 0.08, 0, -d / 2 - 0.1],
    [w + 0.2, 0.08, 0, d / 2 + 0.1],
    [0.08, d + 0.2, -w / 2 - 0.1, 0],
    [0.08, d + 0.2, w / 2 + 0.1, 0],
  ])
    mesh(g, roundBox(bw, 0.08, bd, 0.02), clay(CLAY_SHADE), x, 0.2 + wall, z);
  return { group: g, top: 0.2 + wall + 0.4 };
}

/** A homes lot: this week's tasks for no goal, as houses. */
export function homesLot(site: WorldSite, accent: string) {
  const g = new THREE.Group();
  const houses = new Map<string, { x: number; z: number; top: number }>();
  let height = 0;
  (site.houses ?? []).forEach((h, i) => {
    const [x, z] = HOUSE_SPOTS[i] ?? HOUSE_SPOTS[0];
    const made = house(h, accent);
    made.group.position.set(x, 0, z);
    g.add(made.group);
    houses.set(h.id, { x, z, top: made.top });
    height = Math.max(height, made.top);
  });
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
      fading(i % 2 ? '#ffffff' : GOLD, { metal: 0.2 }),
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
