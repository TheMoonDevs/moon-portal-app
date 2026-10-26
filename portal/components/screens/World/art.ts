import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
const shape = <T extends THREE.BufferGeometry>(key: string, make: () => T) => {
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

const cylinder = (top: number, bottom: number, h: number, seg = 24) =>
  shape(
    `cyl${r2(top)},${r2(bottom)},${r2(h)},${seg}`,
    () => new THREE.CylinderGeometry(top, bottom, h, seg),
  );

const sphere = (r: number, seg = 20, half = false) =>
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
const prism = (w: number, h: number, d: number, right = false) =>
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
  parent.add(m);
  return m;
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
function construction(accent: string, seed: number) {
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

const SKIN = ['#f7d7bd', '#efc39f', '#dca77f', '#bf835b', '#94603f', '#f3cfae'];
const HAIR = ['#2b2118', '#4a3326', '#7a4b2a', '#c99653', '#1b1b1f', '#a8a8ad'];
const PANTS = ['#334155', '#1e3a5f', '#3f3f46', '#57534e'];

export type Person = {
  group: THREE.Group;
  body: THREE.Group;
  legs: [THREE.Group, THREE.Group];
  arms: [THREE.Group, THREE.Group];
};

/**
 * A small clay person in the town's colours: the shirt is the company's
 * colour, and hair, skin and style come from who they are.
 */
export function person(
  id: string,
  brand: WorldBrand,
  badge?: THREE.Material,
): Person {
  const h = hash(id);
  const skin = clay(SKIN[h % SKIN.length]);
  const hair = clay(HAIR[(h >> 3) % HAIR.length]);
  const pants = clay(PANTS[(h >> 6) % PANTS.length]);
  const shirt = clay(brand.primary);
  const style = (h >> 9) % 4;

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

  const leg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, 0);
    body.add(pivot);
    mesh(
      pivot,
      shape('leg', () => new THREE.CapsuleGeometry(0.15, 0.42, 4, 10)),
      pants,
      0,
      -0.36,
      0,
    );
    mesh(
      pivot,
      roundBox(0.28, 0.16, 0.4, 0.07),
      clay('#f9fafb'),
      0,
      -0.72,
      0.06,
    );
    return pivot;
  };
  const arm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.48, 0);
    body.add(pivot);
    mesh(
      pivot,
      shape('arm', () => new THREE.CapsuleGeometry(0.11, 0.4, 4, 10)),
      shirt,
      0,
      -0.26,
      0,
    );
    mesh(pivot, sphere(0.12, 12), skin, 0, -0.56, 0);
    return pivot;
  };
  const legs: [THREE.Group, THREE.Group] = [leg(0.17), leg(-0.17)];
  mesh(
    body,
    shape('torso', () => new THREE.CapsuleGeometry(0.34, 0.4, 6, 16)),
    shirt,
    0,
    1.18,
    0,
  );
  // A white collar and the town's second colour as a belt.
  mesh(body, cylinder(0.2, 0.26, 0.1, 16), clay('#ffffff'), 0, 1.6, 0);
  mesh(body, cylinder(0.35, 0.35, 0.1, 20), clay(brand.secondary), 0, 0.86, 0);
  const arms: [THREE.Group, THREE.Group] = [arm(0.47), arm(-0.47)];
  // The company's logo as a badge on the chest.
  if (badge) {
    const pin = new THREE.Mesh(
      shape('pin', () => new THREE.PlaneGeometry(0.26, 0.26)),
      badge,
    );
    pin.position.set(0.13, 1.3, 0.35);
    body.add(pin);
  }

  const headY = 2.02;
  mesh(body, sphere(0.42, 24), skin, 0, headY, 0);
  for (const x of [-0.14, 0.14]) {
    mesh(
      body,
      sphere(0.07, 12),
      clay('#111827', { rough: 0.3 }),
      x,
      headY + 0.05,
      0.38,
    );
    const cheek = mesh(
      body,
      sphere(0.07, 10),
      clay('#f9a8a8'),
      x * 1.75,
      headY - 0.1,
      0.33,
    );
    cheek.scale.z = 0.4;
  }
  const smile = mesh(
    body,
    shape('smile', () => new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI)),
    clay('#7f1d1d'),
    0,
    headY - 0.12,
    0.4,
  );
  smile.rotation.z = Math.PI;
  mesh(body, sphere(0.08, 10), skin, -0.42, headY, 0);
  mesh(body, sphere(0.08, 10), skin, 0.42, headY, 0);

  // Hair: short, a bun, long, or a cap in the company colour.
  const top = mesh(
    body,
    sphere(0.45, 24, true),
    style === 3 ? clay(brand.primary) : hair,
    0,
    headY + 0.04,
    -0.04,
  );
  top.rotation.x = -0.5;
  top.scale.set(1.02, 0.9, 1.04);
  if (style === 1) mesh(body, sphere(0.2, 14), hair, 0, headY + 0.48, -0.22);
  if (style === 2)
    block(
      body,
      0.8,
      0.75,
      0.3,
      HAIR[(h >> 3) % HAIR.length],
      0,
      headY - 0.5,
      -0.28,
      0.14,
    );
  if (style === 3) {
    const brim = mesh(
      body,
      cylinder(0.3, 0.3, 0.05, 20),
      clay(brand.secondary),
      0,
      headY + 0.18,
      0.36,
    );
    brim.scale.z = 0.8;
    mesh(body, sphere(0.06, 8), clay('#ffffff'), 0, headY + 0.47, 0);
  }
  group.traverse((o) => {
    if (o !== shadow && (o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group, body, legs, arms };
}

/* --------------------------------- bots --------------------------------- */

export function bot(accent: string) {
  const g = new THREE.Group();
  const shell = mesh(
    g,
    sphere(0.62, 24),
    clay('#ffffff', { rough: 0.5 }),
    0,
    0,
    0,
  );
  shell.scale.set(1, 0.62, 1);
  mesh(g, cylinder(0.64, 0.64, 0.12, 28), clay(accent), 0, 0, 0);
  const visor = mesh(
    g,
    roundBox(0.62, 0.2, 0.2, 0.08),
    clay('#111827', { rough: 0.3 }),
    0,
    0.12,
    0.5,
  );
  visor.castShadow = false;
  const light = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 1.4,
  });
  const eye = new THREE.Mesh(roundBox(0.42, 0.07, 0.05, 0.02), light);
  eye.position.set(0, 0.12, 0.61);
  g.add(eye);
  const rotors: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const arm = mesh(
      g,
      roundBox(1.1, 0.08, 0.12, 0.03),
      clay(CLAY),
      Math.cos(a) * 0.75,
      0.18,
      Math.sin(a) * 0.75,
    );
    arm.rotation.y = -a;
    const rotor = new THREE.Group();
    rotor.position.set(Math.cos(a) * 1.25, 0.28, Math.sin(a) * 1.25);
    g.add(rotor);
    mesh(rotor, cylinder(0.08, 0.08, 0.14, 10), clay(accent), 0, 0, 0);
    const blades = mesh(
      rotor,
      shape('blade', () => new THREE.CylinderGeometry(0.42, 0.42, 0.02, 24)),
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        transparent: true,
        opacity: 0.35,
      }),
      0,
      0.08,
      0,
    );
    blades.castShadow = false;
    rotors.push(rotor);
  }
  const glow = new THREE.Mesh(
    shape('glow', () => new THREE.CircleGeometry(0.35, 20)),
    light,
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.4;
  g.add(glow);
  return { group: g, light, rotors };
}

/* ------------------------------ directions ------------------------------ */

const glowMaterials = new Map<string, THREE.MeshBasicMaterial>();
const glow = (hex: string, opacity = 0.9) => {
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
