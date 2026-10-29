import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { Look } from '@/lib/avatar/look';
import {
  defaultLook,
  EYE_HEX,
  HAIR_HEX,
  OUTFIT_HEX,
  SHOE_HEX,
  SKIN_HEX,
} from '@/lib/avatar/look';
import type { WorldBrand } from '@/lib/world/state';

/*
 * Everything in the world is drawn here from simple shapes, in one look:
 * matte white clay with each town's brand colour as the accent, and its
 * logos on signs, flags, boards and the square.
 */

export const CLAY = '#f5f6f8';
export const CLAY_SHADE = '#e4e7ec';
export const GROUND = '#e9ecf1';
export const ASPHALT = '#d3d8e0';
export const INK = '#1f2937';

const color = (hex: string) => new THREE.Color(hex);
const mix = (a: string, b: string, k: number) =>
  `#${color(a).lerp(color(b), k).getHexString()}`;
/** `hex` mixed with white. */
export const tint = (hex: string, k: number) => mix(hex, '#ffffff', k);
/** `hex` mixed with black. */
export const shade = (hex: string, k: number) => mix(hex, '#000000', k);

export const hash = (s: string) =>
  Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toUpperCase() || '?';

/** Only plain web and inline images, never anything that runs. */
export const safeUrl = (url?: string | null) =>
  url &&
  /^(https?:\/\/|\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);)/i.test(url)
    ? url
    : null;

/* ------------------------- materials and shapes ------------------------- */

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function clay(
  hex: string,
  opts: { rough?: number; metal?: number; glow?: number } = {},
) {
  const key = `${hex}|${opts.rough}|${opts.metal}|${opts.glow}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      emissive: opts.glow ? hex : '#000000',
      emissiveIntensity: opts.glow ?? 0,
    });
    materials.set(key, m);
  }
  return m;
}

const geometries = new Map<string, THREE.BufferGeometry>();
export const shape = <T extends THREE.BufferGeometry>(
  key: string,
  make: () => T,
) => {
  let g = geometries.get(key);
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g as T;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export const roundBox = (w: number, h: number, d: number, r = 0.12) =>
  shape(`box${r2(w)},${r2(h)},${r2(d)},${r}`, () => {
    const radius = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
    return radius > 0.02
      ? new RoundedBoxGeometry(w, h, d, 2, radius)
      : new THREE.BoxGeometry(w, h, d);
  });

export const cylinder = (top: number, bottom: number, h: number, seg = 24) =>
  shape(
    `cyl${r2(top)},${r2(bottom)},${r2(h)},${seg}`,
    () => new THREE.CylinderGeometry(top, bottom, h, seg),
  );

export const sphere = (r: number, seg = 20, half = false) =>
  shape(
    `sph${r2(r)},${seg},${half}`,
    () =>
      new THREE.SphereGeometry(
        r,
        seg,
        Math.round(seg * 0.75),
        0,
        Math.PI * 2,
        0,
        half ? Math.PI / 2 : Math.PI,
      ),
  );

/** A triangular prism: the triangle across x (base `w`, peak `h`), `d` deep. */
export const prism = (w: number, h: number, d: number, right = false) =>
  shape(`prism${r2(w)},${r2(h)},${r2(d)},${right}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(right ? -w / 2 : 0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  });

export function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** A rounded block standing on `y`. */
export const block = (
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  hex: string,
  x = 0,
  y = 0,
  z = 0,
  r = 0.12,
) => mesh(parent, roundBox(w, h, d, r), clay(hex), x, y + h / 2, z);

/** A flat strip on the ground: roads, paving, markings. */
export function strip(
  parent: THREE.Object3D,
  w: number,
  d: number,
  hex: string,
  x: number,
  z: number,
  y = 0.02,
) {
  const m = new THREE.Mesh(
    shape(`plane${r2(w)},${r2(d)}`, () => {
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(-Math.PI / 2);
      return g;
    }),
    clay(hex, { rough: 1 }),
  );
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.userData.batch = true;
  parent.add(m);
  return m;
}

/**
 * Draws everything under `root` marked for it (trees and ground strips,
 * hundreds of them in a big town) as one instanced mesh per shape and
 * colour, so the world stays smooth however far it grows. Clicks still
 * reach what each one stood in: `userData.picks[instanceId]`. `root` must
 * sit at the origin.
 */
export function batch(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  type Item = { matrix: THREE.Matrix4; pick: unknown };
  const buckets = new Map<
    string,
    { mesh: THREE.Mesh; items: Item[]; cast: boolean }
  >();
  const marked: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.batch) marked.push(o);
  });
  for (const o of marked) {
    let up: THREE.Object3D | null = o;
    while (up && !up.userData.pick) up = up.parent;
    const pick = up?.userData.pick ?? null;
    o.traverse((m) => {
      if (!(m instanceof THREE.Mesh) || Array.isArray(m.material)) return;
      const key = `${m.geometry.uuid}|${m.material.uuid}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mesh: m, items: [], cast: false }));
      b.items.push({ matrix: m.matrixWorld.clone(), pick });
      b.cast ||= m.castShadow;
    });
  }
  for (const o of marked) o.removeFromParent();
  for (const { mesh: m, items, cast } of Array.from(buckets.values())) {
    const many = new THREE.InstancedMesh(
      m.geometry,
      m.material as THREE.Material,
      items.length,
    );
    items.forEach((it, i) => many.setMatrixAt(i, it.matrix));
    many.computeBoundingSphere();
    many.castShadow = cast;
    many.receiveShadow = true;
    many.userData.picks = items.map((it) => it.pick);
    root.add(many);
  }
}

/* -------------------------------- logos --------------------------------- */

type Loaded = {
  img: HTMLImageElement | null;
  failed: boolean;
  then: (() => void)[];
};
const images = new Map<string, Loaded>();

/**
 * A logo or avatar ready to draw on a canvas, or null while it loads (then
 * `onLoad` runs) or if it can't be drawn (no CORS: the initials stay).
 */
export function image(url: string | null, onLoad: () => void) {
  const src = safeUrl(url);
  if (!src) return null;
  let l = images.get(src);
  if (!l) {
    const entry: Loaded = { img: null, failed: false, then: [] };
    images.set(src, entry);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      entry.img = img;
      entry.then.splice(0).forEach((f) => f());
    };
    img.onerror = () => {
      entry.failed = true;
      entry.then = [];
    };
    img.src = src;
    l = entry;
  }
  if (!l.img && !l.failed) l.then.push(onLoad);
  return l.img;
}

const fontOf = (brand: WorldBrand) =>
  `${brand.font ? `"${brand.font.replace(/["\\]/g, '')}", ` : ''}ui-sans-serif, system-ui, sans-serif`;

/** A round badge: the logo on white, or initials on the brand colour. */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string,
  hex: string,
  img: HTMLImageElement | null,
  font = 'ui-sans-serif, system-ui, sans-serif',
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = img ? '#ffffff' : hex;
  ctx.fill();
  ctx.clip();
  if (img) {
    const pad = size * 0.14;
    const k = Math.min(
      (size - pad * 2) / img.naturalWidth,
      (size - pad * 2) / img.naturalHeight,
    );
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(size * 0.4)}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(name), x + size / 2, y + size / 2 + size * 0.03);
  }
  ctx.restore();
}

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, redraw: () => void) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const ctx = canvas.getContext('2d')!;
  const redraw = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx, redraw);
    texture.needsUpdate = true;
  };
  redraw();
  return { texture, canvas, redraw };
}

const signs = new Map<string, THREE.Material>();
/** A square sign: the logo on white with a brand-coloured rim. */
export function logoSign(name: string, logo: string | null, brand: WorldBrand) {
  const key = `sign|${name}|${logo}|${brand.primary}`;
  let m = signs.get(key);
  if (!m) {
    const { texture } = canvasTexture(256, 256, (ctx, redraw) => {
      ctx.fillStyle = brand.primary;
      ctx.beginPath();
      ctx.roundRect(0, 0, 256, 256, 36);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(14, 14, 228, 228, 26);
      ctx.fill();
      drawBadge(
        ctx,
        28,
        28,
        200,
        name,
        brand.primary,
        image(logo, redraw),
        fontOf(brand),
      );
    });
    m = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      alphaTest: 0.5,
    });
    signs.set(key, m);
  }
  return m;
}

/** A flag in the brand colour with the logo on it. */
export function flagMaterial(
  name: string,
  logo: string | null,
  brand: WorldBrand,
) {
  const key = `flag|${name}|${logo}|${brand.primary}`;
  let m = signs.get(key);
  if (!m) {
    const { texture } = canvasTexture(256, 160, (ctx, redraw) => {
      ctx.fillStyle = brand.primary;
      ctx.fillRect(0, 0, 256, 160);
      drawBadge(
        ctx,
        78,
        30,
        100,
        name,
        brand.secondary,
        image(logo, redraw),
        fontOf(brand),
      );
    });
    m = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    signs.set(key, m);
  }
  return m;
}

/** The company's logo set in the paving at the middle of the square. */
export function groundLogo(
  parent: THREE.Object3D,
  name: string,
  logo: string | null,
  brand: WorldBrand,
  radius: number,
) {
  const { texture } = canvasTexture(512, 512, (ctx, redraw) => {
    ctx.fillStyle = brand.primary;
    ctx.beginPath();
    ctx.arc(256, 256, 254, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 256, 226, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tint(brand.primary, 0.6);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 205, 0, Math.PI * 2);
    ctx.stroke();
    drawBadge(
      ctx,
      96,
      96,
      320,
      name,
      brand.primary,
      image(logo, redraw),
      fontOf(brand),
    );
  });
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  disc.receiveShadow = true;
  parent.add(disc);
  return disc;
}

/* ------------------------------- billboards ------------------------------ */

export type BoardRow = {
  label: string;
  value: number;
  hex: string;
  image?: string | null;
  note?: string;
};
export type BoardData = {
  brand: WorldBrand;
  name: string;
  logo: string | null;
  title: string;
  subtitle: string;
  rows: BoardRow[];
  empty: string;
};

/**
 * A big dashboard board on legs, like a stadium screen, showing a ranking
 * as bars. `draw` repaints it with new numbers.
 */
export function billboard(parent: THREE.Object3D, w: number, h: number) {
  const g = new THREE.Group();
  parent.add(g);
  const legH = 2.6;
  block(g, 0.35, legH + 0.4, 0.35, CLAY_SHADE, -w * 0.32, 0, -0.1, 0.08);
  block(g, 0.35, legH + 0.4, 0.35, CLAY_SHADE, w * 0.32, 0, -0.1, 0.08);
  block(g, w + 0.5, h + 0.5, 0.45, CLAY, 0, legH, -0.1, 0.18);
  let data: BoardData | null = null;
  const W = 1024;
  const H = Math.round((W * h) / w);
  const { texture, redraw } = canvasTexture(W, H, (ctx, again) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    if (!data) return;
    const d = data;
    const font = fontOf(d.brand);
    // Header in the brand colour.
    ctx.fillStyle = d.brand.primary;
    ctx.fillRect(0, 0, W, 132);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(86, 66, 50, 0, Math.PI * 2);
    ctx.fill();
    drawBadge(
      ctx,
      42,
      22,
      88,
      d.name,
      d.brand.primary,
      image(d.logo, again),
      font,
    );
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 46px ${font}`;
    ctx.fillText(d.title, 160, 66, W - 190);
    ctx.globalAlpha = 0.85;
    ctx.font = `500 28px ${font}`;
    ctx.fillText(d.subtitle, 160, 106, W - 190);
    ctx.globalAlpha = 1;

    const rows = d.rows.slice(0, 5);
    if (!rows.length) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `600 36px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText(d.empty, W / 2, 132 + (H - 132) / 2);
      return;
    }
    const max = Math.max(...rows.map((r) => r.value), 1);
    const top = 160;
    const rowH = Math.min(96, (H - top - 20) / rows.length);
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const mid = y + rowH / 2;
      // Place.
      ctx.fillStyle =
        i === 0
          ? '#f59e0b'
          : i === 1
            ? '#9ca3af'
            : i === 2
              ? '#c2814b'
              : '#e5e7eb';
      ctx.beginPath();
      ctx.arc(60, mid, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i < 3 ? '#ffffff' : INK;
      ctx.font = `800 28px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 60, mid + 1);
      drawBadge(
        ctx,
        100,
        mid - 28,
        56,
        r.label,
        r.hex,
        image(r.image ?? null, again),
        font,
      );
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.font = `700 32px ${font}`;
      ctx.fillText(r.label, 172, mid - 14, 330);
      if (r.note) {
        ctx.fillStyle = '#6b7280';
        ctx.font = `500 22px ${font}`;
        ctx.fillText(r.note, 172, mid + 20, 330);
      }
      // Bar.
      const x0 = 520;
      const bw = W - x0 - 130;
      ctx.fillStyle = '#eef0f3';
      ctx.beginPath();
      ctx.roundRect(x0, mid - 16, bw, 32, 16);
      ctx.fill();
      ctx.fillStyle = r.hex;
      ctx.beginPath();
      ctx.roundRect(x0, mid - 16, Math.max(32, (bw * r.value) / max), 32, 16);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = `800 32px ${font}`;
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(r.value)), W - 30, mid + 1);
    });
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  screen.position.set(0, legH + 0.25 + h / 2, 0.14);
  g.add(screen);
  return {
    group: g,
    draw: (next: BoardData) => {
      data = next;
      redraw();
    },
  };
}

/* ------------------------------- buildings ------------------------------- */

export type Animated = (t: number, dt: number) => void;
export type BuildingKind = 'tower' | 'factory' | 'warehouse' | 'silos' | 'lab';

/** What a task building looks like at each tier: it changes on upgrade. */
const TIER_KINDS: BuildingKind[][] = [
  [],
  ['lab', 'tower', 'silos'],
  ['factory', 'silos', 'tower'],
  ['tower'],
];
/** How wide it stands on its lot, by tier. */
const TIER_SCALE = [0, 0.56, 0.74, 0.9];

/** Logo signs on the front and the back, so it shows from either side. */
function signs2(
  g: THREE.Object3D,
  sign: THREE.Material,
  size: number,
  y: number,
  z: number,
  x = 0,
) {
  const geo = shape(
    `sign${r2(size)}`,
    () => new THREE.PlaneGeometry(size, size),
  );
  const front = new THREE.Mesh(geo, sign);
  front.position.set(x, y, z + 0.03);
  const back = new THREE.Mesh(geo, sign);
  back.position.set(x, y, -z - 0.03);
  back.rotation.y = Math.PI;
  g.add(front, back);
}

/** Smoke rising from a chimney top. */
function smoke(
  g: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  seed: number,
): Animated {
  const puffs = Array.from({ length: 4 }, () =>
    mesh(g, sphere(0.45, 12), clay('#ffffff'), x, y, z),
  );
  puffs.forEach((p) => (p.castShadow = false));
  return (t) =>
    puffs.forEach((p, i) => {
      const k = (t * 0.35 + i / puffs.length + seed) % 1;
      p.position.set(x + k * 1.2, y + k * 3.2, z - k * 0.6);
      p.scale.setScalar(0.5 + k * 1.3 * (1 - k * 0.6));
    });
}

/**
 * A building for a project on its lot, facing +z, in white with the
 * town's accent and the project's logo on signs.
 */
export function building(
  kind: BuildingKind,
  height: number,
  accent: string,
  sign: THREE.Material,
  seed: number,
) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  const glass = tint(accent, 0.12);
  const h = height;

  if (kind === 'tower') {
    block(g, 8.4, 1.2, 8.4, CLAY_SHADE, 0, 0, 0, 0.2);
    block(g, 6.2, h - 1.2, 6.2, CLAY, 0, 1.2, 0, 0.25);
    for (let y = 2.6; y < h - 1.4; y += 1.5)
      block(g, 6.3, 0.5, 6.3, glass, 0, y, 0, 0.06);
    block(g, 4.6, 1.4, 4.6, CLAY, 0, h, 0, 0.2);
    block(g, 4.8, 0.25, 4.8, accent, 0, h + 1.4, 0, 0.06);
    block(g, 1.2, 0.6, 1, CLAY_SHADE, -1.2, h + 1.65, -0.8, 0.1);
    mesh(g, cylinder(0.06, 0.06, 3), clay(CLAY_SHADE), 1.4, h + 3.1, 1.2);
    mesh(g, sphere(0.16, 10), clay(accent, { glow: 0.6 }), 1.4, h + 4.6, 1.2);
    signs2(g, sign, 2.8, h - 1.9, 3.12);
    // The entrance.
    block(g, 2.4, 1.8, 0.6, accent, 0, 1.2, 3.1, 0.08);
  } else if (kind === 'factory') {
    const wall = Math.max(3, h * 0.42);
    block(g, 8.4, wall, 6, CLAY, 0, 0, -1, 0.15);
    for (let i = 0; i < 3; i++) {
      const x = -2.8 + i * 2.8;
      mesh(g, prism(2.8, 1.3, 6, true), clay(CLAY), x, wall, -1);
      // Glass on the upright face.
      const pane = mesh(
        g,
        shape('pane', () => new THREE.PlaneGeometry(5.8, 1.1)),
        clay(glass),
        x - 1.39,
        wall + 0.6,
        -1,
      );
      pane.rotation.y = -Math.PI / 2;
    }
    block(g, 3, 1.4, 0.3, accent, -1.6, 0, 2.05, 0.05);
    block(g, 3.4, 2.4, 2, CLAY, 2.3, 0, 2.6, 0.12);
    signs2(g, sign, 1.6, 1.3, 3.6, 2.3);
    for (const [x, z, k] of [
      [2.9, -3, 1],
      [1.5, -3.2, 0.82],
    ] as const) {
      const top = h * k + 1;
      mesh(g, cylinder(0.42, 0.55, top), clay(CLAY), x, top / 2, z);
      mesh(g, cylinder(0.45, 0.45, 0.4), clay(accent), x, top - 0.7, z);
      mesh(g, cylinder(0.45, 0.45, 0.25), clay(accent), x, top - 1.5, z);
      anims.push(smoke(g, x, top + 0.4, z, seed + x));
    }
  } else if (kind === 'warehouse') {
    const wall = Math.max(2.8, h * 0.4);
    block(g, 8.4, wall, 6.2, CLAY, 0, 0, 0, 0.15);
    const roof = mesh(g, prism(6.6, 1.9, 8.8), clay(CLAY_SHADE), 0, wall, 0);
    roof.rotation.y = Math.PI / 2;
    block(g, 8.6, 0.3, 6.4, accent, 0, wall - 0.3, 0, 0.05);
    for (const x of [-2.6, 2.6])
      block(g, 2, 2.1, 0.12, tint(accent, 0.15), x, 0, 3.12, 0.04);
    signs2(g, sign, 1.7, wall - 1.3, 3.1);
    // Crates and a pallet out front.
    block(g, 0.9, 0.9, 0.9, tint(accent, 0.45), -3.6, 0, 3.9, 0.08);
    block(g, 0.7, 0.7, 0.7, CLAY_SHADE, -3.5, 0.9, 3.9, 0.08);
  } else if (kind === 'silos') {
    const tall = Math.max(4, h * 0.78);
    for (const x of [-2.7, 0, 2.7]) {
      mesh(g, cylinder(1.25, 1.25, tall), clay(CLAY), x, tall / 2, -1.4);
      mesh(g, sphere(1.25, 20, true), clay(CLAY), x, tall, -1.4);
      for (const y of [tall * 0.35, tall * 0.7])
        mesh(g, cylinder(1.28, 1.28, 0.28), clay(accent), x, y, -1.4);
    }
    block(g, 7, 0.35, 0.7, CLAY_SHADE, 0, tall + 0.9, -1.4, 0.05);
    block(g, 4.2, 2.4, 2.4, CLAY, 0, 0, 2.4, 0.14);
    block(g, 4.4, 0.3, 2.6, accent, 0, 2.4, 2.4, 0.05);
    signs2(g, sign, 1.6, 1.2, 3.6);
  } else {
    // A lab: a dome on a round base.
    mesh(g, cylinder(3.6, 3.8, 1.6, 40), clay(CLAY), 0, 0.8, -0.6);
    mesh(g, cylinder(3.66, 3.66, 0.35, 40), clay(accent), 0, 1.45, -0.6);
    const dome = mesh(g, sphere(3.4, 32, true), clay(CLAY), 0, 1.6, -0.6);
    dome.scale.y = Math.max(0.8, (h - 1.6) / 3.4) * 0.75;
    mesh(
      g,
      cylinder(0.5, 0.5, 0.3),
      clay(accent),
      0,
      1.6 + 3.4 * dome.scale.y,
      -0.6,
    );
    block(g, 2.6, 2.2, 1.8, CLAY, 0, 0, 3, 0.12);
    block(g, 1.2, 1.5, 0.1, accent, 0, 0, 3.92, 0.03);
    signs2(g, sign, 1.3, 1.75, 3.9);
    const dish = new THREE.Group();
    dish.position.set(-3.4, 0, 2.6);
    g.add(dish);
    mesh(dish, cylinder(0.08, 0.08, 2), clay(CLAY_SHADE), 0, 1, 0);
    const bowl = mesh(dish, sphere(0.7, 16, true), clay(CLAY), 0, 2.1, 0);
    bowl.rotation.x = Math.PI * 0.75;
    anims.push((t) => (dish.rotation.y = Math.sin(t * 0.3 + seed) * 1.2));
  }
  return { group: g, anims };
}

/** A lot being built on: a slab, scaffolding and a crane. */
export function construction(accent: string, seed: number) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  block(g, 6, 0.3, 6, CLAY_SHADE, 0, 0, 0, 0.08);
  block(g, 4, 1.4, 4, CLAY, 0, 0.3, 0, 0.06);
  const pole = clay(tint(accent, 0.25));
  for (const [x, z] of [
    [-2.4, -2.4],
    [2.4, -2.4],
    [-2.4, 2.4],
    [2.4, 2.4],
  ])
    block(g, 0.12, 3, 0.12, accent, x, 0.3, z, 0.02);
  for (const y of [1.4, 2.8])
    for (const [w, d, x, z] of [
      [4.9, 0.1, 0, -2.4],
      [4.9, 0.1, 0, 2.4],
      [0.1, 4.9, -2.4, 0],
      [0.1, 4.9, 2.4, 0],
    ])
      mesh(g, roundBox(w, 0.1, d, 0.02), pole, x, y + 0.3, z);
  // A crane, turning slowly.
  mesh(g, cylinder(0.14, 0.14, 7, 8), clay(accent), 2.8, 3.5, -2.8);
  const jib = new THREE.Group();
  jib.position.set(2.8, 7, -2.8);
  g.add(jib);
  block(jib, 6, 0.25, 0.25, accent, -1.6, 0, 0, 0.04);
  block(jib, 0.8, 0.6, 0.6, CLAY_SHADE, 1.2, -0.3, 0, 0.08);
  mesh(jib, cylinder(0.02, 0.02, 2.4, 4), clay(INK), -3.8, -1.2, 0);
  block(jib, 0.5, 0.5, 0.5, tint(accent, 0.4), -3.8, -2.9, 0, 0.06);
  anims.push((t) => (jib.rotation.y = Math.sin(t * 0.25 + seed) * 1.4));
  return { group: g, anims };
}

/**
 * A task building: taller with every level, and a new, bigger look at
 * every tier. Tier 0 is still being built. Tier 3 and up wear gold.
 */
export function site(
  id: string,
  tier: number,
  level: number,
  accent: string,
  sign: THREE.Material,
) {
  const seed = (hash(id) % 100) / 10;
  if (tier <= 0) return { ...construction(accent, seed), height: 7.5 };
  const t = Math.min(tier, 3);
  const kinds = TIER_KINDS[t];
  const kind = kinds[hash(id) % kinds.length];
  const scale = TIER_SCALE[t];
  // World height grows a floor per level.
  const height = [0, 2.4, 3.6, 5.2][t] + level * [0, 0.85, 1.1, 1.35][t];
  const made = building(kind, height / scale, accent, sign, seed);
  made.group.scale.setScalar(scale);
  const g = new THREE.Group();
  g.add(made.group);
  const top = new THREE.Box3().setFromObject(g).max.y;
  if (tier >= 3) {
    const gold = clay('#f5b301', { metal: 0.5, rough: 0.35 });
    const crown = new THREE.Group();
    crown.position.set(0, top, 0);
    g.add(crown);
    mesh(crown, cylinder(0.5, 0.7, 0.4, 8), gold, 0, 0.2, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mesh(
        crown,
        cylinder(0.01, 0.12, 0.45, 6),
        gold,
        Math.cos(a) * 0.55,
        0.6,
        Math.sin(a) * 0.55,
      );
    }
    if (tier >= 4) {
      const beacon = mesh(
        crown,
        sphere(0.3, 14),
        clay('#fde68a', { glow: 1.2 }),
        0,
        1.1,
        0,
      );
      made.anims.push((tt) =>
        beacon.scale.setScalar(1 + Math.sin(tt * 3 + seed) * 0.2),
      );
    }
    made.anims.push((tt) => (crown.rotation.y = tt * 0.6));
  }
  return { group: g, anims: made.anims, height: top + (tier >= 3 ? 1.4 : 0) };
}

/** The town hall at the back of the square, facing +z. */
export function townHall(
  sign: THREE.Material,
  flag: THREE.Material,
  accent: string,
) {
  const g = new THREE.Group();
  const anims: Animated[] = [];
  block(g, 7.2, 0.4, 7.2, CLAY_SHADE, 0, 0, 0, 0.12);
  block(g, 6.4, 0.4, 6.4, CLAY, 0, 0.4, 0, 0.12);
  block(g, 5.2, 3.4, 4, CLAY, 0, 0.8, -0.6, 0.15);
  for (const x of [-2, -0.67, 0.67, 2])
    mesh(g, cylinder(0.24, 0.26, 3.2, 16), clay(CLAY), x, 2.4, 2.2);
  block(g, 5.8, 0.45, 5.6, CLAY, 0, 4, 0, 0.1);
  mesh(g, prism(5.8, 1.5, 5.6), clay(accent), 0, 4.45, 0);
  const disc = new THREE.Mesh(
    shape('hallSign', () => new THREE.CircleGeometry(0.62, 40)),
    sign,
  );
  disc.position.set(0, 5.05, 2.82);
  g.add(disc);
  mesh(g, cylinder(1.3, 1.3, 0.8, 32), clay(CLAY), 0, 5.4, -1.2);
  mesh(g, sphere(1.3, 24, true), clay(accent), 0, 5.8, -1.2);
  mesh(g, cylinder(0.05, 0.05, 2.6), clay(CLAY_SHADE), 0, 8.2, -1.2);
  const cloth = new THREE.Mesh(
    shape('hallFlag', () => new THREE.PlaneGeometry(1.6, 1)),
    flag,
  );
  cloth.position.set(0.8, 8.9, -1.2);
  g.add(cloth);
  anims.push((t) => (cloth.rotation.y = Math.sin(t * 1.7) * 0.25));
  return { group: g, anims };
}

/** A flag pole with the company's flag. */
export function flagPole(
  parent: THREE.Object3D,
  flag: THREE.Material,
  x: number,
  z: number,
  seed: number,
): Animated {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(g, cylinder(0.07, 0.09, 6), clay(CLAY_SHADE), 0, 3, 0);
  mesh(g, sphere(0.14, 10), clay(CLAY), 0, 6.05, 0);
  const pivot = new THREE.Group();
  pivot.position.set(0, 5.2, 0);
  g.add(pivot);
  const cloth = new THREE.Mesh(
    shape('flag', () => new THREE.PlaneGeometry(2, 1.25)),
    flag,
  );
  cloth.position.x = 1.02;
  cloth.castShadow = true;
  pivot.add(cloth);
  return (t) => (pivot.rotation.y = Math.sin(t * 1.4 + seed) * 0.3 + 0.6);
}

export function tree(
  parent: THREE.Object3D,
  accent: string,
  x: number,
  z: number,
  rand: () => number,
) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.batch = true;
  const s = 0.75 + rand() * 0.6;
  g.scale.setScalar(s);
  parent.add(g);
  mesh(g, cylinder(0.12, 0.16, 1.2, 8), clay(CLAY_SHADE), 0, 0.6, 0);
  const leaf = clay(rand() < 0.5 ? tint(accent, 0.35) : tint(accent, 0.15));
  if (rand() < 0.65) {
    mesh(g, sphere(0.95, 16), leaf, 0, 1.9, 0);
    if (rand() < 0.5) mesh(g, sphere(0.6, 14), leaf, 0.45, 2.55, 0.1);
  } else {
    mesh(g, cylinder(0.01, 0.95, 2.4, 14), leaf, 0, 2.3, 0);
  }
  return g;
}

export function turbine(
  parent: THREE.Object3D,
  x: number,
  z: number,
  seed: number,
): Animated {
  const g = new THREE.Group();
  g.position.set(x, -0.6, z);
  g.rotation.y = Math.PI / 4;
  parent.add(g);
  mesh(g, cylinder(0.16, 0.32, 13, 14), clay(CLAY), 0, 6.5, 0);
  block(g, 0.7, 0.6, 1.5, CLAY, 0, 12.8, 0, 0.2);
  const rotor = new THREE.Group();
  rotor.position.set(0, 13.1, 0.85);
  g.add(rotor);
  mesh(rotor, sphere(0.28, 12), clay(CLAY), 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    rotor.add(arm);
    block(arm, 0.32, 5.2, 0.08, CLAY, 0, 0.1, 0, 0.03);
  }
  return (t) => (rotor.rotation.z = t * 1.1 + seed);
}

export function car(hex: string) {
  const g = new THREE.Group();
  block(g, 1.7, 0.55, 0.9, hex, 0, 0.18, 0, 0.18);
  block(g, 0.95, 0.45, 0.8, CLAY, -0.1, 0.73, 0, 0.16);
  for (const [x, z] of [
    [0.55, 0.42],
    [-0.55, 0.42],
    [0.55, -0.42],
    [-0.55, -0.42],
  ]) {
    const wheel = mesh(
      g,
      cylinder(0.2, 0.2, 0.16, 12),
      clay('#4b5563'),
      x,
      0.2,
      z,
    );
    wheel.rotation.x = Math.PI / 2;
  }
  return g;
}

/* -------------------------------- people -------------------------------- */

const capsule = (r: number, len: number) =>
  shape(
    `cap${r2(r)},${r2(len)}`,
    () => new THREE.CapsuleGeometry(r, len, 4, 12),
  );
export const cone = (r: number, h: number, seg = 16) =>
  shape(
    `cone${r2(r)},${r2(h)},${seg}`,
    () => new THREE.ConeGeometry(r, h, seg),
  );
export const torus = (r: number, tube: number, arc = Math.PI * 2, sides = 24) =>
  shape(
    `torus${r2(r)},${r2(tube)},${r2(arc)},${sides}`,
    () => new THREE.TorusGeometry(r, tube, 8, sides, arc),
  );
const flat = (key: string, s: THREE.Shape, depth = 0.03) =>
  shape(key, () => {
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  });
const heart = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.1);
  s.bezierCurveTo(-0.16, 0.02, -0.1, 0.13, 0, 0.05);
  s.bezierCurveTo(0.1, 0.13, 0.16, 0.02, 0, -0.1);
  return flat('heart', s);
};
const star = () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.045 : 0.11;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return flat('star', s);
};
/** A half disc, flat side up: a grin. */
const halfDisc = (r: number) =>
  shape(
    `half${r2(r)}`,
    () => new THREE.CircleGeometry(r, 16, Math.PI, Math.PI),
  );

const EYE = '#1f1a17';
const GOLD = '#facc15';
const PINK = '#f9a8d4';
const PET_HEX: Record<Exclude<Look['pet'], 'none'>, string> = {
  cat: '#f6a65a',
  dog: '#d6a774',
  bunny: '#ffffff',
  chick: '#fde047',
  fox: '#f97316',
  panda: '#ffffff',
  dragon: '#4ade80',
  slime: '#60a5fa',
};

export type Person = {
  group: THREE.Group;
  /** Everything but the shadow, pet and aura: bobs as they walk. */
  body: THREE.Group;
  head: THREE.Group;
  legs: [THREE.Group, THREE.Group];
  arms: [THREE.Group, THREE.Group];
  /** Their pet, at their feet, or null. */
  pet: THREE.Group | null;
  /** Sparkles or hearts that circle them, or a glow: spin it. */
  aura: THREE.Group | null;
};

/**
 * A little chibi person: a big round head on a small body, dressed the
 * way they chose (`look`). A "brand" outfit is the company's colour, and
 * the company's logo is pinned on the chest.
 */
export function person(
  id: string,
  brand: WorldBrand,
  badge?: THREE.Material,
  look: Look = defaultLook(id),
): Person {
  const skinHex = SKIN_HEX[look.skin];
  const skin = clay(skinHex);
  const hairHex = HAIR_HEX[look.hairColor];
  const hair = clay(hairHex);
  const ownColour = look.outfitColor !== 'brand';
  const outfitHex =
    look.outfitColor === 'brand' ? brand.primary : OUTFIT_HEX[look.outfitColor];
  const outfit = clay(outfitHex);
  // Hats, scarves, belts and capes: the company colour, or its second
  // colour when the outfit already is the company colour (a cheery pink if
  // that one is nearly black or white).
  const second = new THREE.Color(brand.secondary).getHSL({ h: 0, s: 0, l: 0 });
  const accentHex = ownColour
    ? brand.primary
    : second.l > 0.2 && second.l < 0.85
      ? brand.secondary
      : '#f472b6';
  const accent = clay(accentHex);
  const ink = clay(EYE, { rough: 0.3 });
  const white = clay('#ffffff');
  const metal = clay('#cbd5e1', { rough: 0.35, metal: 0.5 });
  const o = look.outfit;
  const pants = clay(
    ['overalls', 'suit', 'ninja', 'kimono', 'robe', 'armor'].includes(o)
      ? outfitHex
      : o === 'dress' || o === 'sailor'
        ? skinHex
        : '#3b4a63',
  );
  const shirt =
    o === 'overalls' || o === 'sailor' ? white : o === 'armor' ? metal : outfit;

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const shadow = new THREE.Mesh(
    shape('blob', () => new THREE.CircleGeometry(0.55, 24)),
    new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  // Short legs and little shoes (or boots).
  const shoe = clay(SHOE_HEX[look.shoes]);
  const leg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.5, 0);
    body.add(pivot);
    mesh(pivot, capsule(0.12, 0.2), pants, 0, -0.2, 0);
    if (look.shoes === 'boots')
      mesh(pivot, roundBox(0.26, 0.3, 0.32, 0.08), shoe, 0, -0.34, 0.03);
    else mesh(pivot, roundBox(0.24, 0.14, 0.32, 0.07), shoe, 0, -0.42, 0.05);
    return pivot;
  };
  const legs: [THREE.Group, THREE.Group] = [leg(0.14), leg(-0.14)];

  // A round little body, then the outfit's own pieces.
  mesh(body, capsule(0.3, 0.28), shirt, 0, 0.88, 0);
  if (o === 'dress')
    mesh(body, cylinder(0.3, 0.48, 0.42, 24), outfit, 0, 0.64, 0);
  if (o === 'overalls') {
    mesh(body, cylinder(0.315, 0.315, 0.3, 24), outfit, 0, 0.62, 0);
    mesh(body, roundBox(0.36, 0.3, 0.1, 0.04), outfit, 0, 0.92, 0.25);
    for (const x of [-0.12, 0.12])
      mesh(body, sphere(0.035, 8), clay(GOLD), x, 1.02, 0.31);
  }
  if (o === 'hoodie') {
    const hood = mesh(body, torus(0.26, 0.1), outfit, 0, 1.26, -0.12);
    hood.rotation.x = Math.PI / 2 - 0.3;
    mesh(
      body,
      roundBox(0.36, 0.14, 0.08, 0.04),
      clay(shade(outfitHex, 0.12)),
      0,
      0.7,
      0.27,
    );
    for (const x of [-0.07, 0.07])
      mesh(body, capsule(0.015, 0.12), white, x, 1.08, 0.3);
  }
  if (o === 'jacket') {
    mesh(body, roundBox(0.16, 0.5, 0.06, 0.03), white, 0, 0.9, 0.28);
    for (const s of [-1, 1]) {
      const lapel = mesh(
        body,
        roundBox(0.08, 0.22, 0.05, 0.02),
        clay(shade(outfitHex, 0.15)),
        s * 0.12,
        1.08,
        0.28,
      );
      lapel.rotation.z = s * 0.35;
    }
  }
  if (o === 'suit') {
    mesh(body, roundBox(0.2, 0.32, 0.06, 0.03), white, 0, 1.04, 0.27);
    mesh(body, roundBox(0.07, 0.26, 0.04, 0.02), accent, 0, 1.0, 0.31);
  }
  if (o === 'sailor') {
    mesh(body, roundBox(0.66, 0.06, 0.56, 0.03), outfit, 0, 1.24, -0.04);
    for (const s of [-1, 1]) {
      const bow = mesh(
        body,
        sphere(0.07, 10),
        clay('#ef4444'),
        s * 0.07,
        1.1,
        0.3,
      );
      bow.scale.set(1.2, 0.8, 0.5);
    }
    mesh(body, cylinder(0.3, 0.46, 0.34, 24), outfit, 0, 0.62, 0);
  }
  if (o === 'ninja') {
    mesh(body, cylinder(0.315, 0.315, 0.1, 24), accent, 0, 0.7, 0);
    const wrap = mesh(
      body,
      roundBox(0.12, 0.6, 0.62, 0.04),
      clay(shade(outfitHex, 0.25)),
      0,
      0.98,
      0,
    );
    wrap.rotation.z = 0.6;
  }
  if (o === 'kimono' || o === 'robe') {
    for (const s of [-1, 1]) {
      const fold = mesh(
        body,
        roundBox(0.06, 0.4, 0.04, 0.02),
        white,
        s * 0.07,
        1.08,
        0.29,
      );
      fold.rotation.z = s * 0.45;
    }
    if (o === 'kimono')
      mesh(body, cylinder(0.32, 0.32, 0.16, 24), accent, 0, 0.76, 0);
    mesh(
      body,
      cylinder(0.31, o === 'robe' ? 0.5 : 0.4, o === 'robe' ? 0.62 : 0.5, 24),
      outfit,
      0,
      o === 'robe' ? 0.42 : 0.52,
      0,
    );
    if (o === 'robe') {
      const hood = mesh(body, torus(0.26, 0.1), outfit, 0, 1.26, -0.12);
      hood.rotation.x = Math.PI / 2 - 0.3;
      mesh(body, star(), clay(GOLD), 0.12, 1.0, 0.31);
    }
  }
  if (o === 'armor') {
    mesh(body, cylinder(0.32, 0.32, 0.1, 24), outfit, 0, 0.7, 0);
    for (const s of [-1, 1])
      mesh(body, sphere(0.17, 14), metal, s * 0.34, 1.14, 0);
  }

  const arm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.12, 0);
    body.add(pivot);
    mesh(
      pivot,
      capsule(0.09, 0.2),
      o === 'armor' ? outfit : shirt,
      0,
      -0.17,
      0,
    );
    mesh(pivot, sphere(0.1, 12), skin, 0, -0.36, 0);
    return pivot;
  };
  const arms: [THREE.Group, THREE.Group] = [arm(0.36), arm(-0.36)];

  if (badge) {
    const pin = new THREE.Mesh(
      shape('pin', () => new THREE.PlaneGeometry(0.22, 0.22)),
      badge,
    );
    pin.position.set(0.13, o === 'overalls' ? 0.92 : 0.96, 0.32);
    body.add(pin);
  }

  // Extras on the body, or in the hand.
  const e = look.extra;
  const hand = arms[0];
  if (e === 'backpack')
    mesh(body, roundBox(0.46, 0.5, 0.24, 0.1), accent, 0, 0.9, -0.33);
  if (e === 'scarf') {
    const scarf = mesh(body, torus(0.26, 0.09), accent, 0, 1.27, 0);
    scarf.rotation.x = Math.PI / 2;
    mesh(body, roundBox(0.14, 0.32, 0.06, 0.03), accent, 0.13, 1.08, 0.3);
  }
  if (e === 'cape') {
    const cape = mesh(
      body,
      roundBox(0.62, 0.92, 0.05, 0.03),
      o === 'armor' ? clay('#b91c1c') : accent,
      0,
      0.8,
      -0.34,
    );
    cape.rotation.x = 0.14;
  }
  if (e === 'wings')
    for (const s of [-1, 1]) {
      const wing = mesh(body, sphere(0.4, 16), white, s * 0.3, 1.0, -0.36);
      wing.scale.set(0.5, 0.8, 0.14);
      wing.rotation.z = s * 0.7;
    }
  if (e === 'balloon') {
    mesh(body, cylinder(0.008, 0.008, 1.7, 4), clay('#9ca3af'), 0.5, 1.6, 0);
    const balloon = mesh(
      body,
      sphere(0.3, 20),
      clay(ownColour ? brand.primary : '#f472b6', { rough: 0.35 }),
      0.5,
      2.75,
      0,
    );
    balloon.scale.y = 1.15;
  }
  if (e === 'katana') {
    const sword = new THREE.Group();
    sword.position.set(0, 0.95, -0.36);
    sword.rotation.z = 0.75;
    body.add(sword);
    mesh(sword, cylinder(0.045, 0.045, 1.0, 10), clay('#1f2937'), 0, -0.1, 0);
    mesh(sword, cylinder(0.1, 0.1, 0.03, 16), clay(GOLD), 0, 0.42, 0);
    mesh(sword, cylinder(0.04, 0.04, 0.28, 10), accent, 0, 0.58, 0);
  }
  if (e === 'staff') {
    mesh(hand, cylinder(0.035, 0.035, 1.5, 8), clay('#a16207'), 0, -0.25, 0.06);
    mesh(hand, sphere(0.11, 14), clay(accentHex, { glow: 0.5 }), 0, 0.52, 0.06);
  }
  if (e === 'book')
    mesh(hand, roundBox(0.22, 0.28, 0.08, 0.02), accent, 0, -0.4, 0.14);
  if (e === 'coffee') {
    mesh(hand, cylinder(0.07, 0.06, 0.16, 14), white, 0, -0.36, 0.14);
    mesh(hand, cylinder(0.072, 0.07, 0.06, 14), accent, 0, -0.37, 0.14);
  }

  // The big round head.
  const head = new THREE.Group();
  head.position.y = 1.8;
  body.add(head);
  const R = 0.6;
  mesh(head, sphere(R, 32), skin);
  /** How far out the face is at (x, y), plus `lift`. */
  const face = (x: number, y: number, lift = 0) =>
    Math.sqrt(Math.max(0, R * R - x * x - y * y)) + lift;
  const h = look.hair;
  const hiddenEars =
    h === 'bob' || h === 'long' || h === 'afro' || h === 'twin tails';
  if (!hiddenEars && look.hat !== 'headphones')
    for (const s of [-1, 1])
      mesh(head, sphere(0.12, 12), skin, s * 0.59, -0.04, 0);

  // Eyes.
  const dot = (x: number, big: boolean) => {
    const r = big ? 0.11 : 0.08;
    const eye = mesh(head, sphere(r, 14), ink, x, -0.02, face(x, 0) - 0.03);
    eye.scale.set(1, 1.18, 0.5);
    mesh(
      head,
      sphere(big ? 0.035 : 0.026, 8),
      white,
      x + 0.03,
      0.03,
      face(x, 0) + 0.02,
    );
    if (big)
      mesh(head, sphere(0.018, 6), white, x - 0.03, -0.06, face(x, 0) + 0.01);
  };
  const anime = (x: number) => {
    const z = face(x, 0);
    const outer = mesh(head, sphere(0.13, 16), ink, x, -0.03, z - 0.035);
    outer.scale.set(0.95, 1.4, 0.4);
    const iris = mesh(
      head,
      sphere(0.1, 16),
      clay(EYE_HEX[look.eyeColor], { rough: 0.3 }),
      x,
      -0.06,
      z - 0.015,
    );
    iris.scale.set(0.85, 1.15, 0.4);
    const pupil = mesh(head, sphere(0.05, 10), ink, x, -0.07, z);
    pupil.scale.set(1, 1.3, 0.4);
    mesh(head, sphere(0.045, 10), white, x + 0.035, 0.05, z + 0.015);
    mesh(head, sphere(0.02, 6), white, x - 0.03, -0.12, z + 0.01);
    const lash = mesh(
      head,
      torus(0.11, 0.022, Math.PI, 12),
      ink,
      x,
      0.02,
      z - 0.01,
    );
    lash.scale.y = 0.9;
  };
  const arc = (x: number, up: boolean) => {
    const a = mesh(
      head,
      torus(0.07, 0.022, Math.PI, 12),
      ink,
      x,
      up ? -0.05 : 0.01,
      face(x, 0),
    );
    if (!up) a.rotation.z = Math.PI;
  };
  for (const [i, x] of [-0.21, 0.21].entries()) {
    if (look.eyes === 'happy' || (look.eyes === 'wink' && i === 1))
      arc(x, true);
    else if (look.eyes === 'sleepy') arc(x, false);
    else if (look.eyes === 'anime') anime(x);
    else if (look.eyes === 'stars') {
      const st = mesh(
        head,
        star(),
        clay('#fbbf24', { glow: 0.3 }),
        x,
        -0.02,
        face(x, 0),
      );
      st.scale.setScalar(0.95);
    } else dot(x, look.eyes === 'big');
  }

  // Mouth.
  const my = -0.19;
  const mz = face(0, my);
  const lips = clay('#9f2d2d');
  if (look.mouth === 'smile' || look.mouth === 'tongue') {
    const smile = mesh(
      head,
      torus(0.07, 0.02, Math.PI, 12),
      lips,
      0,
      my + 0.02,
      mz,
    );
    smile.rotation.z = Math.PI;
    if (look.mouth === 'tongue') {
      const t = mesh(
        head,
        sphere(0.04, 10),
        clay('#f87171'),
        0.02,
        my - 0.06,
        mz - 0.01,
      );
      t.scale.set(1, 1.2, 0.5);
    }
  }
  if (look.mouth === 'grin') {
    const g = mesh(
      head,
      halfDisc(0.085),
      clay('#7f1d1d'),
      0,
      my + 0.02,
      mz + 0.005,
    );
    g.rotation.x = -0.15;
  }
  if (look.mouth === 'open') {
    const m = mesh(
      head,
      sphere(0.05, 12),
      clay('#7f1d1d'),
      0,
      my - 0.01,
      mz - 0.02,
    );
    m.scale.set(0.9, 1.15, 0.35);
  }
  if (look.mouth === 'cat')
    for (const s of [-1, 1]) {
      const w = mesh(
        head,
        torus(0.04, 0.016, Math.PI, 10),
        lips,
        s * 0.04,
        my + 0.01,
        mz,
      );
      w.rotation.z = Math.PI;
    }

  // Cheeks and face marks.
  if (look.cheeks === 'rosy')
    for (const s of [-1, 1]) {
      const c = mesh(
        head,
        sphere(0.09, 12),
        clay('#f9a8a8'),
        s * 0.35,
        -0.15,
        face(0.35, -0.15) - 0.02,
      );
      c.scale.z = 0.35;
    }
  if (look.cheeks === 'freckles')
    for (const s of [-1, 1])
      for (const [x, y] of [
        [0.3, -0.1],
        [0.37, -0.14],
        [0.31, -0.18],
      ])
        mesh(head, sphere(0.018, 6), clay('#b77a52'), s * x, y, face(x, y));
  if (look.marks === 'blush lines')
    for (const s of [-1, 1])
      for (const k of [-1, 0, 1]) {
        const x = 0.34 + k * 0.05;
        const l = mesh(
          head,
          roundBox(0.014, 0.08, 0.01, 0.005),
          clay('#f472b6'),
          s * x,
          -0.13,
          face(x, -0.13) + 0.005,
        );
        l.rotation.z = s * 0.45;
      }
  if (look.marks === 'whiskers')
    for (const s of [-1, 1])
      for (const k of [-1, 0, 1]) {
        const y = -0.13 + k * 0.05;
        const w = mesh(
          head,
          roundBox(0.13, 0.014, 0.01, 0.005),
          clay('#3f2a1d'),
          s * 0.36,
          y,
          face(0.36, y) + 0.005,
        );
        w.rotation.y = s * 0.55;
      }
  if (look.marks === 'scar') {
    const sc = mesh(
      head,
      roundBox(0.14, 0.02, 0.01, 0.005),
      clay('#9f2d2d'),
      -0.24,
      -0.15,
      face(0.24, -0.15) + 0.005,
    );
    sc.rotation.z = -0.2;
    for (const x of [-0.28, -0.2])
      mesh(
        head,
        roundBox(0.012, 0.06, 0.01, 0.004),
        clay('#9f2d2d'),
        x,
        -0.15,
        face(x, -0.15) + 0.008,
      );
  }
  if (look.marks === 'star') {
    const st = mesh(
      head,
      star(),
      clay(GOLD),
      0.3,
      -0.18,
      face(0.3, -0.18) + 0.005,
    );
    st.scale.setScalar(0.5);
  }

  // Hair.
  const cap = () => {
    const top = mesh(head, sphere(0.64, 32, true), hair, 0, 0.02, -0.03);
    top.rotation.x = -0.45;
    top.scale.set(1.02, 0.92, 1.04);
  };
  const back = (stretch: number) => {
    const b = mesh(
      head,
      sphere(0.66, 24, true),
      hair,
      0,
      -0.1 - (stretch - 1) * 0.6,
      -0.04,
    );
    b.rotation.x = -Math.PI / 2;
    // After the turn, the dome's height runs along y as its z scale.
    b.scale.set(1.04, 1, stretch);
  };
  const up = new THREE.Vector3(0, 1, 0);
  const spikes = (list: number[][], r: number, len: number, at = 0.6) => {
    for (const [az, el] of list) {
      const d = new THREE.Vector3(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        Math.cos(az) * Math.cos(el) - 0.1,
      ).normalize();
      const spike = mesh(
        head,
        cone(r, len, 10),
        hair,
        d.x * at,
        d.y * at,
        d.z * at,
      );
      spike.quaternion.setFromUnitVectors(up, d);
    }
  };
  if (h !== 'bald' && h !== 'mohawk' && h !== 'afro') cap();
  if (h === 'bob') back(1);
  if (h === 'long') back(1.45);
  if (h === 'bun') mesh(head, sphere(0.24, 16), hair, 0, 0.6, -0.22);
  if (h === 'topknot') {
    mesh(head, sphere(0.16, 14), hair, 0, 0.7, -0.08);
    mesh(head, cylinder(0.09, 0.09, 0.08, 12), accent, 0, 0.6, -0.06);
  }
  if (h === 'ponytail') {
    mesh(head, sphere(0.08, 10), accent, 0, 0.12, -0.62);
    const tail = mesh(head, capsule(0.14, 0.45), hair, 0, -0.2, -0.72);
    tail.rotation.x = 0.35;
  }
  if (h === 'pigtails')
    for (const s of [-1, 1]) {
      mesh(head, sphere(0.2, 16), hair, s * 0.68, 0.0, -0.12);
      mesh(head, sphere(0.07, 8), accent, s * 0.56, 0.08, -0.1);
    }
  if (h === 'twin tails')
    for (const s of [-1, 1]) {
      mesh(head, sphere(0.09, 10), accent, s * 0.5, 0.38, -0.22);
      const tail = mesh(head, capsule(0.15, 1.0), hair, s * 0.78, -0.32, -0.24);
      tail.rotation.z = s * 0.22;
    }
  if (h === 'side bangs') {
    for (const [x, len, tilt] of [
      [-0.32, 0.3, 0.5],
      [-0.14, 0.34, 0.45],
      [0.04, 0.32, 0.4],
      [0.22, 0.26, 0.35],
    ]) {
      const y = 0.32;
      const fringe = mesh(
        head,
        cone(0.13, len, 10),
        hair,
        x,
        y - len / 3,
        face(x, y) - 0.04,
      );
      fringe.rotation.set(-0.35, 0, Math.PI - tilt);
    }
  }
  if (h === 'curly')
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.cos(a) > 0.55) continue;
      const ring = i % 2 ? 0.5 : 0.36;
      mesh(
        head,
        sphere(0.17, 12),
        hair,
        Math.sin(a) * ring,
        i % 2 ? 0.36 : 0.52,
        Math.cos(a) * ring - 0.04,
      );
    }
  if (h === 'afro') {
    const puff = mesh(head, sphere(0.86, 28, true), hair, 0, -0.08, -0.1);
    puff.rotation.x = -0.55;
    puff.scale.set(1.05, 1.05, 1.05);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.cos(a) > 0.4) continue;
      mesh(
        head,
        sphere(0.26, 12),
        hair,
        Math.sin(a) * 0.7,
        0.35,
        Math.cos(a) * 0.6 - 0.15,
      );
    }
  }
  if (h === 'spiky')
    spikes(
      [
        [0, 1.35],
        [0.9, 1.0],
        [-0.9, 1.0],
        [2.2, 0.9],
        [-2.2, 0.9],
        [Math.PI, 1.0],
        [0.3, 0.95],
        [-0.3, 0.95],
      ],
      0.13,
      0.34,
    );
  if (h === 'hero spikes')
    spikes(
      [
        [0, 1.45],
        [0.5, 1.2],
        [-0.5, 1.2],
        [1.2, 0.95],
        [-1.2, 0.95],
        [2.0, 0.85],
        [-2.0, 0.85],
        [2.8, 0.9],
        [-2.8, 0.9],
        [0.2, 0.75],
        [-0.25, 0.8],
      ],
      0.19,
      0.62,
      0.55,
    );
  if (h === 'mohawk') {
    const m = mesh(head, roundBox(0.16, 0.32, 0.95, 0.07), hair, 0, 0.56, -0.1);
    m.rotation.x = -0.2;
  }

  // On the head.
  const hat = look.hat;
  if (hat === 'cap') {
    const crown = mesh(head, sphere(0.65, 32, true), accent, 0, 0.04, -0.02);
    crown.rotation.x = -0.25;
    const brim = mesh(
      head,
      cylinder(0.32, 0.32, 0.05, 24),
      accent,
      0,
      0.24,
      0.5,
    );
    brim.scale.z = 0.9;
    mesh(head, sphere(0.06, 8), white, 0, 0.68, -0.14);
  }
  if (hat === 'beanie') {
    const b = mesh(head, sphere(0.66, 32, true), accent, 0, 0.06, -0.02);
    b.rotation.x = -0.2;
    b.scale.y = 1.08;
    const rim = mesh(head, torus(0.6, 0.08), white, 0, 0.1, 0.0);
    rim.rotation.x = Math.PI / 2 - 0.2;
    mesh(head, sphere(0.15, 12), white, 0, 0.82, -0.14);
  }
  if (hat === 'party hat') {
    const p = mesh(head, cone(0.28, 0.62, 20), accent, 0.08, 0.84, -0.04);
    p.rotation.z = -0.18;
    mesh(head, sphere(0.09, 10), clay(GOLD), 0.14, 1.15, -0.04);
  }
  if (hat === 'crown') {
    const gold = clay(GOLD, { rough: 0.35, metal: 0.4 });
    mesh(head, cylinder(0.32, 0.34, 0.16, 20), gold, 0, 0.62, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mesh(
        head,
        cone(0.08, 0.18, 8),
        gold,
        Math.sin(a) * 0.3,
        0.78,
        Math.cos(a) * 0.3,
      );
      mesh(
        head,
        sphere(0.035, 8),
        clay('#ef4444', { glow: 0.2 }),
        Math.sin(a) * 0.33,
        0.62,
        Math.cos(a) * 0.33,
      );
    }
  }
  if (hat === 'headphones') {
    mesh(head, torus(0.66, 0.05, Math.PI, 20), ink, 0, 0.02, 0);
    for (const s of [-1, 1]) {
      const cup = mesh(
        head,
        cylinder(0.17, 0.17, 0.14, 20),
        accent,
        s * 0.64,
        0,
        0,
      );
      cup.rotation.z = Math.PI / 2;
    }
  }
  if (hat === 'flower') {
    const at = new THREE.Vector3(0.36, 0.42, face(0.36, 0.42) - 0.05);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mesh(
        head,
        sphere(0.08, 10),
        clay(PINK),
        at.x + Math.cos(a) * 0.1,
        at.y + Math.sin(a) * 0.1,
        at.z,
      );
    }
    mesh(head, sphere(0.06, 10), clay(GOLD), at.x, at.y, at.z + 0.04);
  }
  if (hat === 'ahoge') {
    const strand = mesh(
      head,
      torus(0.13, 0.03, Math.PI * 1.3, 14),
      hair,
      0.04,
      0.74,
      -0.02,
    );
    strand.rotation.set(0, Math.PI / 2, -0.4);
  }
  if (hat === 'cat ears')
    for (const s of [-1, 1]) {
      const ear = mesh(head, cone(0.18, 0.34, 4), hair, s * 0.36, 0.62, -0.04);
      ear.rotation.z = -s * 0.45;
      const inner = mesh(
        head,
        cone(0.09, 0.18, 4),
        clay('#f9a8a8'),
        s * 0.35,
        0.6,
        0.04,
      );
      inner.rotation.z = -s * 0.45;
    }
  if (hat === 'bunny ears')
    for (const s of [-1, 1]) {
      const ear = mesh(head, capsule(0.09, 0.42), white, s * 0.2, 0.86, -0.08);
      ear.rotation.z = -s * 0.15;
      const inner = mesh(
        head,
        capsule(0.045, 0.3),
        clay(PINK),
        s * 0.205,
        0.86,
        -0.0,
      );
      inner.rotation.z = -s * 0.15;
    }
  if (hat === 'horns')
    for (const s of [-1, 1]) {
      const horn = mesh(
        head,
        cone(0.1, 0.36, 12),
        clay('#3f3f46', { rough: 0.4 }),
        s * 0.34,
        0.62,
        0,
      );
      horn.rotation.z = -s * 0.5;
    }
  if (hat === 'halo') {
    const ring = mesh(
      head,
      torus(0.34, 0.045),
      clay(GOLD, { glow: 0.6 }),
      0,
      0.92,
      0,
    );
    ring.rotation.x = Math.PI / 2;
  }
  if (hat === 'ninja headband') {
    const band = mesh(
      head,
      torus(0.615, 0.06, Math.PI * 2, 32),
      clay('#1e3a8a'),
      0,
      0.22,
      -0.02,
    );
    band.rotation.x = Math.PI / 2 + 0.15;
    band.scale.z = 1.6;
    const plate = mesh(
      head,
      roundBox(0.32, 0.15, 0.04, 0.03),
      metal,
      0,
      0.26,
      face(0, 0.26) + 0.02,
    );
    plate.rotation.x = -0.4;
    for (const s of [-1, 1]) {
      const tail = mesh(
        head,
        roundBox(0.07, 0.4, 0.02, 0.01),
        clay('#1e3a8a'),
        s * 0.1,
        0.0,
        -0.64,
      );
      tail.rotation.z = s * 0.25;
    }
  }
  if (hat === 'straw hat') {
    const straw = clay('#e8c872');
    const g = new THREE.Group();
    g.position.y = 0.42;
    g.rotation.x = -0.18;
    head.add(g);
    mesh(g, cylinder(0.95, 0.95, 0.04, 32), straw, 0, 0, 0);
    mesh(g, cylinder(0.44, 0.48, 0.32, 24), straw, 0, 0.18, 0);
    mesh(g, cylinder(0.485, 0.485, 0.08, 24), clay('#dc2626'), 0, 0.07, 0);
  }
  if (hat === 'wizard hat') {
    const wiz = clay(ownColour ? outfitHex : '#6d28d9');
    const g = new THREE.Group();
    g.position.y = 0.45;
    g.rotation.x = -0.15;
    head.add(g);
    mesh(g, cylinder(0.85, 0.85, 0.04, 32), wiz, 0, 0, 0);
    const tip = mesh(g, cone(0.42, 1.0, 24), wiz, 0.05, 0.5, 0);
    tip.rotation.z = -0.15;
    mesh(g, star(), clay(GOLD), 0.05, 0.35, 0.33);
  }

  // Glasses.
  if (look.glasses !== 'none') {
    const z = 0.6;
    for (const x of [-0.21, 0.21]) {
      if (look.glasses === 'round')
        mesh(head, torus(0.12, 0.02), ink, x, -0.02, z);
      if (look.glasses === 'square') {
        const f = mesh(
          head,
          torus(0.15, 0.022, Math.PI * 2, 4),
          ink,
          x,
          -0.02,
          z,
        );
        f.rotation.z = Math.PI / 4;
      }
      if (look.glasses === 'shades')
        mesh(
          head,
          roundBox(0.25, 0.16, 0.04, 0.05),
          clay('#111827', { rough: 0.2 }),
          x,
          -0.02,
          z,
        );
      if (look.glasses === 'hearts') {
        const ht = mesh(
          head,
          heart(),
          clay('#f43f5e', { rough: 0.3 }),
          x,
          -0.01,
          z,
        );
        ht.scale.setScalar(1.15);
      }
    }
    mesh(head, roundBox(0.12, 0.025, 0.025, 0.01), ink, 0, 0.0, z + 0.01);
  }

  // A pet at their feet.
  let pet: THREE.Group | null = null;
  if (look.pet !== 'none') {
    const kind = look.pet;
    pet = new THREE.Group();
    pet.position.set(0.85, 0, 0.45);
    group.add(pet);
    const fur = clay(PET_HEX[kind]);
    const dark = clay('#27272a');
    if (kind === 'slime') {
      const blob = mesh(
        pet,
        sphere(0.24, 20, true),
        clay(PET_HEX.slime, { rough: 0.2 }),
        0,
        0.02,
        0,
      );
      blob.scale.set(1, 1.15, 1);
      for (const s of [-1, 1])
        mesh(pet, sphere(0.03, 8), ink, s * 0.07, 0.14, 0.2);
      mesh(pet, sphere(0.05, 8), white, 0.08, 0.22, 0.12);
    } else {
      const round = kind === 'chick';
      const torso = mesh(pet, sphere(round ? 0.2 : 0.18, 16), fur, 0, 0.2, 0);
      torso.scale.set(1, 0.9, round ? 1 : 1.3);
      const hy = round ? 0.42 : 0.4;
      const hz = round ? 0.04 : 0.2;
      mesh(pet, sphere(round ? 0.15 : 0.16, 16), fur, 0, hy, hz);
      for (const s of [-1, 1]) {
        if (kind === 'panda') {
          const patch = mesh(
            pet,
            sphere(0.045, 8),
            dark,
            s * 0.06,
            hy + 0.02,
            hz + 0.12,
          );
          patch.scale.set(1, 1.3, 0.6);
          mesh(pet, sphere(0.015, 6), white, s * 0.06, hy + 0.03, hz + 0.15);
        } else mesh(pet, sphere(0.025, 6), ink, s * 0.06, hy + 0.02, hz + 0.14);
      }
      if (kind === 'cat' || kind === 'fox')
        for (const s of [-1, 1]) {
          const ear = mesh(
            pet,
            cone(kind === 'fox' ? 0.07 : 0.06, kind === 'fox' ? 0.16 : 0.12, 4),
            fur,
            s * 0.09,
            hy + 0.15,
            hz,
          );
          ear.rotation.z = -s * 0.3;
        }
      if (kind === 'dog')
        for (const s of [-1, 1]) {
          const ear = mesh(
            pet,
            sphere(0.07, 10),
            clay(shade(PET_HEX.dog, 0.3)),
            s * 0.15,
            hy,
            hz - 0.02,
          );
          ear.scale.set(0.5, 1.2, 0.8);
        }
      if (kind === 'dog' || kind === 'fox')
        mesh(
          pet,
          sphere(0.06, 10),
          kind === 'fox' ? white : fur,
          0,
          hy - 0.05,
          hz + 0.15,
        );
      if (kind === 'panda')
        for (const s of [-1, 1])
          mesh(pet, sphere(0.06, 10), dark, s * 0.12, hy + 0.13, hz - 0.02);
      if (kind === 'bunny')
        for (const s of [-1, 1]) {
          const ear = mesh(
            pet,
            capsule(0.04, 0.2),
            fur,
            s * 0.06,
            hy + 0.24,
            hz - 0.03,
          );
          ear.rotation.z = -s * 0.12;
        }
      if (kind === 'chick') {
        const beak = mesh(
          pet,
          cone(0.04, 0.09, 8),
          clay('#fb923c'),
          0,
          hy - 0.03,
          hz + 0.17,
        );
        beak.rotation.x = Math.PI / 2;
      }
      if (kind === 'dragon') {
        for (const s of [-1, 1]) {
          const horn = mesh(
            pet,
            cone(0.03, 0.1, 8),
            clay(GOLD),
            s * 0.07,
            hy + 0.16,
            hz - 0.02,
          );
          horn.rotation.z = -s * 0.3;
          const wing = mesh(
            pet,
            sphere(0.14, 10),
            clay(shade(PET_HEX.dragon, 0.2)),
            s * 0.18,
            0.32,
            -0.05,
          );
          wing.scale.set(0.9, 0.6, 0.15);
          wing.rotation.z = s * 0.6;
        }
        mesh(pet, sphere(0.06, 10), fur, 0, hy - 0.05, hz + 0.14);
      }
      if (
        kind === 'cat' ||
        kind === 'dog' ||
        kind === 'fox' ||
        kind === 'dragon'
      ) {
        const tail = mesh(
          pet,
          capsule(kind === 'fox' ? 0.07 : 0.035, 0.24),
          fur,
          0,
          0.32,
          -0.26,
        );
        tail.rotation.x = -0.6;
        if (kind === 'fox') mesh(pet, sphere(0.06, 8), white, 0, 0.45, -0.36);
      }
      if (kind === 'bunny' || kind === 'panda')
        mesh(
          pet,
          sphere(0.07, 10),
          kind === 'panda' ? dark : fur,
          0,
          0.2,
          -0.24,
        );
      if (kind === 'panda')
        for (const s of [-1, 1])
          mesh(pet, sphere(0.07, 8), dark, s * 0.12, 0.1, 0.12);
    }
  }

  // An aura that circles them.
  let aura: THREE.Group | null = null;
  if (look.aura !== 'none') {
    aura = new THREE.Group();
    group.add(aura);
    if (look.aura === 'glow') {
      const ring = new THREE.Mesh(
        torus(0.72, 0.05, Math.PI * 2, 40),
        new THREE.MeshBasicMaterial({
          color: accentHex,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06;
      aura.add(ring);
      const glow = new THREE.Mesh(
        shape(
          'auraGlow',
          () => new THREE.CylinderGeometry(0.72, 0.72, 2.6, 32, 1, true),
        ),
        new THREE.MeshBasicMaterial({
          color: accentHex,
          transparent: true,
          opacity: 0.07,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      glow.position.y = 1.3;
      aura.add(glow);
    } else {
      const item = look.aura === 'hearts' ? heart() : star();
      const mat = clay(look.aura === 'hearts' ? '#f472b6' : GOLD, {
        glow: 0.5,
      });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const m = new THREE.Mesh(item, mat);
        m.position.set(
          Math.cos(a) * 0.95,
          0.6 + (i % 3) * 0.7,
          Math.sin(a) * 0.95,
        );
        m.scale.setScalar(1.3);
        aura.add(m);
      }
    }
  }

  group.traverse((x) => {
    if (x !== shadow && (x as THREE.Mesh).isMesh) x.castShadow = true;
  });
  aura?.traverse((x) => (x.castShadow = false));
  return { group, body, head, legs, arms, pet, aura };
}

/* --------------------------------- bots --------------------------------- */

export type Bot = {
  group: THREE.Group;
  /** Everything above the ground shadow: hops, leans and spins. */
  body: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  arms: [THREE.Group, THREE.Group];
  antenna: THREE.Group;
  /** The eyes' glow: the bot's state colour, blue on the road. */
  light: THREE.MeshStandardMaterial;
};

/**
 * A little white robot: a round body and a big round head with a dark
 * face, two glowing eyes, ear pods and an antenna in the company colour,
 * and its logo on the chest. It floats just off the ground.
 */
export function bot(accent: string, badge?: THREE.Material): Bot {
  const white = clay('#ffffff', { rough: 0.42 });
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(
    shape('botShadow', () => new THREE.CircleGeometry(0.5, 24)),
    new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);
  const body = new THREE.Group();
  group.add(body);

  const torso = mesh(body, sphere(0.46, 24), white, 0, 0.6, 0);
  torso.scale.set(1, 1.12, 0.95);
  mesh(body, cylinder(0.455, 0.455, 0.07, 28), clay(accent), 0, 0.5, 0);
  if (badge) {
    const pin = new THREE.Mesh(
      shape('botPin', () => new THREE.PlaneGeometry(0.26, 0.26)),
      badge,
    );
    pin.position.set(0, 0.74, 0.43);
    pin.rotation.x = -0.15;
    body.add(pin);
  }

  const light = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 1.6,
  });
  // A soft glow under it, where it floats.
  const under = new THREE.Mesh(
    shape('botGlow', () => new THREE.CircleGeometry(0.22, 20)),
    light,
  );
  under.rotation.x = Math.PI / 2;
  under.position.y = 0.12;
  body.add(under);

  const arm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.86, 0);
    body.add(pivot);
    mesh(
      pivot,
      shape('botArm', () => new THREE.CapsuleGeometry(0.085, 0.26, 4, 10)),
      white,
      0,
      -0.2,
      0,
    );
    mesh(pivot, sphere(0.1, 12), clay(tint(accent, 0.2)), 0, -0.42, 0);
    return pivot;
  };
  const arms: [THREE.Group, THREE.Group] = [arm(0.5), arm(-0.5)];

  const head = new THREE.Group();
  head.position.y = 1.32;
  body.add(head);
  const skull = mesh(head, sphere(0.5, 28), white, 0, 0, 0);
  skull.scale.set(1.15, 0.86, 1);
  const face = mesh(
    head,
    sphere(0.42, 24),
    clay('#0f172a', { rough: 0.2 }),
    0,
    -0.02,
    0.3,
  );
  face.scale.set(1.04, 0.7, 0.6);
  const eyes = [-0.16, 0.16].map((x) => {
    const eye = new THREE.Mesh(sphere(0.075, 14), light);
    eye.position.set(x, 0.0, 0.54);
    eye.scale.set(1, 1.45, 0.45);
    head.add(eye);
    return eye;
  });
  for (const x of [-0.58, 0.58]) {
    const pod = mesh(
      head,
      cylinder(0.14, 0.14, 0.1, 18),
      clay(accent),
      x,
      0,
      0,
    );
    pod.rotation.z = Math.PI / 2;
  }
  const antenna = new THREE.Group();
  antenna.position.y = 0.4;
  head.add(antenna);
  mesh(antenna, cylinder(0.022, 0.03, 0.32, 8), clay(CLAY_SHADE), 0, 0.16, 0);
  mesh(antenna, sphere(0.085, 12), clay(accent, { glow: 0.7 }), 0, 0.36, 0);

  group.traverse((o) => {
    if (o !== shadow && (o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group, body, head, eyes, arms, antenna, light };
}

/* ------------------------------ directions ------------------------------ */

const glowMaterials = new Map<string, THREE.MeshBasicMaterial>();
export const glow = (hex: string, opacity = 0.9) => {
  const key = `${hex}|${opacity}`;
  let m = glowMaterials.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    glowMaterials.set(key, m);
  }
  return m;
};

type Point = { x: number; z: number };
const lengthOf = (points: Point[]) =>
  points.reduce(
    (n, p, i) =>
      i ? n + Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) : 0,
    0,
  );

/** Where along `points` you are after `d` world units. */
export function along(points: Point[], d: number) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= len || i === points.length - 1) {
      const k = len ? Math.min(1, d / len) : 1;
      return {
        x: a.x + (b.x - a.x) * k,
        z: a.z + (b.z - a.z) * k,
        angle: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    d -= len;
  }
  return { x: points[0].x, z: points[0].z, angle: 0 };
}

/**
 * A route on the roads: a glowing band with dots flowing along it toward
 * the end, like directions on a map.
 */
export function routeLine(points: Point[], hex: string, width = 0.7) {
  const g = new THREE.Group();
  const y = 0.14;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.01) continue;
    const band = new THREE.Mesh(
      shape(`band${r2(width)}`, () => {
        const geo = new THREE.PlaneGeometry(width, 1);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }),
      glow(hex, 0.55),
    );
    band.scale.z = len;
    band.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    band.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    g.add(band);
  }
  for (const p of points.slice(1, -1)) {
    const joint = new THREE.Mesh(
      shape(`joint${r2(width)}`, () => {
        const geo = new THREE.CircleGeometry(width / 2, 16);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }),
      glow(hex, 0.55),
    );
    joint.position.set(p.x, y, p.z);
    g.add(joint);
  }
  const total = lengthOf(points);
  const dots = Array.from(
    { length: Math.max(2, Math.floor(total / 3)) },
    () => {
      const dot = new THREE.Mesh(sphere(width * 0.45, 10), glow('#ffffff', 1));
      g.add(dot);
      return dot;
    },
  );
  const anim: Animated = (t) =>
    dots.forEach((dot, i) => {
      const at = along(
        points,
        (t * 6 + (i * total) / dots.length) % total || 0,
      );
      dot.position.set(at.x, y + 0.08, at.z);
    });
  return { group: g, anim };
}

/** Rings spreading out from a spot, like a ping on a map. */
export function ripple(x: number, z: number, hex: string, size = 3) {
  const g = new THREE.Group();
  g.position.set(x, 0.16, z);
  const rings = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(
      shape('ripple', () => {
        const geo = new THREE.RingGeometry(0.86, 1, 48);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }),
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    g.add(ring);
    return ring;
  });
  const anim: Animated = (t) =>
    rings.forEach((ring, i) => {
      const k = (t * 0.7 + i / rings.length) % 1;
      ring.scale.setScalar(0.4 + k * size);
      (ring.material as THREE.MeshBasicMaterial).opacity = 1 - k;
    });
  return { group: g, anim };
}
