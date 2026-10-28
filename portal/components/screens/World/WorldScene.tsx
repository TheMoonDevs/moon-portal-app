'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { lookOf } from '@/lib/avatar/look';
import type {
  World,
  WorldBot,
  WorldBrand,
  WorldProject,
  WorldSite,
  WorldTown,
} from '@/lib/world/state';
import {
  BOT_STATE_COLOR,
  goalTowers,
  goesToOwner,
  STATUS_EMOJI,
} from '@/lib/world/state';

import * as art from './art';
import type { TownSpot } from './layout';
import {
  BLOCK,
  HALL_IN,
  layoutWorld,
  LOT,
  LOTS,
  PLOT,
  plotSpot,
  route,
  seeded,
} from './layout';
import * as lots from './lots';

/*
 * The world in plain three.js (no React renderer, whose JSX types clash with
 * MUI's), seen from above at an angle like a strategy game. Companies are
 * towns in their brand colours, joined by highways. A town grows square by
 * square: the town square, where everyone has a plot to stand on, with the
 * town hall and the leaderboards, then a square of four task buildings per four kinds of
 * task in each project. Bots travel the roads (glowing blue while they do)
 * to the building they work at, and back to their owner's plot when they
 * are done or need permission. Everything is drawn from simple shapes in art.ts, so
 * there are no models to download.
 */

export type Pick = {
  type: 'town' | 'project' | 'site' | 'person' | 'bot';
  id: string;
};

/** Bots glow this while they travel. */
const TRANSIT = '#2563eb';
/** Bots walk to their work and back, slowly enough to watch. */
const TRANSIT_SPEED = 6.5;

/** World units from top to bottom of the screen at zoom 1. */
const VIEW = 60;
const SKY = '#eef1f5';
const SUN = new THREE.Vector3(-22, 60, 48).normalize();
const AZIMUTH = Math.PI / 4;
const POLAR = 0.88;

const brandOf = (item: {
  brand?: WorldBrand;
  color: string | null;
  logo: string | null;
}): WorldBrand =>
  item.brand ?? {
    primary: item.color || '#4f46e5',
    secondary: '#111827',
    logo: item.logo,
    font: null,
  };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A logo or avatar for a label: the image, or initials if it won't load. */
const badge = (
  url: string | null,
  name: string,
  hex: string,
  size: number,
  round = true,
  cover = false,
) => {
  const src = art.safeUrl(url);
  return `<span class="relative inline-flex shrink-0 items-center justify-center overflow-hidden ${round ? 'rounded-full' : 'rounded-lg'} font-extrabold text-white" style="width:${size}px;height:${size}px;background:${hex};font-size:${Math.round(size * 0.4)}px">${escape(art.initials(name))}${src ? `<img src="${escape(src)}" alt="" draggable="false" class="absolute inset-0 size-full bg-white ${cover ? 'object-cover' : 'object-contain p-[12%]'}" onerror="this.remove()">` : ''}</span>`;
};

const tag = (className: string, html = '') => {
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = className;
  inner.innerHTML = html;
  outer.appendChild(inner);
  return { obj: new CSS2DObject(outer), inner };
};

const botEmoji = (bot: WorldBot) =>
  bot.state === 'waiting'
    ? '❓'
    : bot.state === 'blocked'
      ? STATUS_EMOJI.blocked
      : bot.state === 'done'
        ? STATUS_EMOJI.done
        : bot.state === 'working'
          ? STATUS_EMOJI.doing
          : '💤';

const botTagHtml = (bot: WorldBot, hex: string, compact: boolean) => {
  const pct = bot.progress.total
    ? Math.round((bot.progress.done / bot.progress.total) * 100)
    : 0;
  // Back with its owner, whose name is right there: just how it's doing.
  if (compact)
    return `<div class="flex items-center gap-0.5 whitespace-nowrap"><span>${botEmoji(bot)}</span><span class="font-semibold text-neutral-700">${bot.progress.done}/${bot.progress.total}</span></div>`;
  const tool =
    bot.state === 'working'
      ? ({ crane: '🏗️', hammer: '🔨', laptop: '💻' }[bot.tool] ?? '')
      : '';
  return `<div class="flex items-center gap-1 whitespace-nowrap">${badge(bot.ownerAvatar ?? null, bot.ownerName, hex, 18, true, true)}<span>${botEmoji(bot)}${tool}</span><span class="font-semibold">${escape(bot.ownerName)}</span><span class="text-neutral-500">${bot.progress.done}/${bot.progress.total}</span></div><div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200"><div class="h-full rounded-full" style="width:${pct}%;background:${BOT_STATE_COLOR[bot.state]}"></div></div>`;
};

/** A bot's points and done points, to see what is new. */
const tallyOf = (bot: WorldBot) => ({
  points: bot.points.length,
  done: bot.points.filter((p) => p.status === 'done').length,
});

/** A lot's label: what it is and how it is doing. */
const siteTagHtml = (site: WorldSite) => {
  const chip = (text: string) =>
    ` <span class="ml-0.5 rounded-full px-1 text-white" style="background:${site.color}">${text}</span>`;
  if (site.kind === 'homes')
    return `This week${chip(`${site.done}/${site.done + site.open} done`)}`;
  if (site.kind === 'target')
    return `${escape(site.name)}${chip(site.achieved ? 'Record' : `${Math.round(site.done).toLocaleString()} / ${(site.target ?? 0).toLocaleString()}`)}${site.records?.length ? ` <span class="text-amber-500">${'★'.repeat(Math.min(site.records.length, 4))}</span>` : ''}`;
  const { total } = goalTowers(site.done);
  const p = site.period;
  return `${escape(site.name)}${chip(`${p ? `${p.done}/${p.target}` : ''} · ${total === 1 ? '' : `${total} bldg · `}${site.done % 10 || (site.done ? 10 : 0)}F`)}${site.missed ? ' <span class="text-rose-500">missed</span>' : ''}`;
};

/**
 * A bot's little life: it hops along the roads, types away at its
 * building, now and then spins or looks around, hops round and round in
 * front of its owner, jumping and waving, when it needs them, dances about
 * its spot when done, paces and shakes its head when blocked and dozes when asleep. And
 * it blinks.
 */
/** True when it has just reached the end of its road. */
function act(b: BotEntity, t: number, dt: number) {
  let arrived = false;
  const { group: g, parts: P } = b;
  const k = t + b.seed;
  let y = 0.12 + Math.sin(k * 2.2) * 0.05;
  let spin = 0;
  let lean = 0;
  let sway = 0;
  let arms = [0, 0.15, 0, -0.15]; // left x, left z, right x, right z
  let look = 0;
  let nod = 0;
  let tilt = 0;
  let squint = 1;
  let wiggle = Math.sin(k * 3) * 0.15;

  if (b.path) {
    // Walking along the roads with a little bob, glowing blue.
    b.travelled += dt * TRANSIT_SPEED;
    const at = art.along(b.path, b.travelled);
    g.position.set(at.x, 0, at.z);
    turn(g, at.angle, dt * 8);
    y = 0.14 + Math.abs(Math.sin(b.travelled * 2.4)) * 0.16;
    lean = 0.12;
    const step = Math.sin(b.travelled * 2.4);
    arms = [step * 0.6, 0.15, -step * 0.6, -0.15];
    wiggle = Math.sin(k * 6) * 0.2;
    arrived = b.travelled >= pathLength(b.path);
  } else {
    const state = b.bot.state;
    let gx = b.target.x;
    let gz = b.target.z;
    let speed = 3;
    if (state === 'waiting' && b.owner) {
      // Urgent: hops round and round its spot, fast.
      gx += Math.cos(k * 2.4) * 0.5;
      gz += Math.sin(k * 2.4) * 0.5;
      speed = 4;
    } else if (state === 'done' && b.owner) {
      // Happy: wanders round its spot.
      gx += Math.cos(k * 0.7) * 0.4;
      gz += Math.sin(k * 0.9) * 0.4;
      speed = 1.6;
    } else if (state === 'blocked') {
      // Paces up and down.
      gx += Math.sin(k * 0.8) * 0.9;
      gz -= Math.sin(k * 0.8) * 0.9;
      speed = 1.4;
    }
    const dx = gx - g.position.x;
    const dz = gz - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const step = Math.min(dist, dt * speed);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
    }
    g.position.y = 0;
    if (dist > 0.4) turn(g, Math.atan2(dx, dz), dt * 8);
    else turn(g, b.face, dt * 4);

    if (state === 'working' && b.bot.tool === 'hammer' && dist < 0.4) {
      // Hammering away: up, then down hard, and again.
      const beat = (k * 1.6) % 1;
      const swing =
        beat < 0.7 ? -2.7 + beat * 0.6 : -2.3 + ((beat - 0.7) / 0.3) * 1.9;
      arms = [-0.5, 0.25, swing, -0.1];
      lean = beat > 0.75 ? 0.18 : 0.04;
      nod = beat > 0.8 ? 0.12 : 0;
      y = 0.12;
    } else if (state === 'working' && b.bot.tool === 'crane' && dist < 0.4) {
      // At the crane's controls, working the levers and looking up.
      arms = [
        -0.9 + Math.sin(k * 3) * 0.3,
        0.1,
        -0.9 + Math.sin(k * 3 + 1.4) * 0.3,
        -0.1,
      ];
      nod = -0.25;
      look = Math.sin(k * 0.35) * 0.6;
      y = 0.12;
    } else if (state === 'working') {
      // Busy at the building, with a hop and a spin now and then.
      const phase = k % 7;
      arms = [
        -1.1 + Math.sin(k * 12) * 0.35,
        0.15,
        -1.1 + Math.sin(k * 12 + Math.PI) * 0.35,
        -0.15,
      ];
      nod = Math.sin(k * 6) * 0.06;
      if (phase < 0.7) {
        y += Math.sin((phase / 0.7) * Math.PI) * 0.6;
        spin = (phase / 0.7) * Math.PI * 2;
        arms = [0, 1.2, 0, -1.2];
      } else if (phase > 3 && phase < 4.6)
        look = Math.sin((phase - 3) * 4) * 0.7;
    } else if (state === 'waiting') {
      // Jumping and waving: over here!
      y = 0.12 + Math.abs(Math.sin(k * 5)) * 0.9;
      arms = [
        0,
        2.6 + Math.sin(k * 10) * 0.3,
        0,
        -2.6 - Math.sin(k * 10 + 1) * 0.3,
      ];
      tilt = Math.sin(k * 2) * 0.15;
      wiggle = Math.sin(k * 12) * 0.4;
    } else if (state === 'done') {
      // Happy: a little dance and a twirl.
      squint = 0.4;
      const phase = k % 4;
      sway = Math.sin(k * 4) * 0.12;
      arms = [0, 0.6 + Math.sin(k * 4) * 0.4, 0, -0.6 - Math.sin(k * 4) * 0.4];
      if (phase < 0.8) {
        spin = (phase / 0.8) * Math.PI * 2;
        y += Math.sin((phase / 0.8) * Math.PI) * 0.5;
        arms = [0, 2.5, 0, -2.5];
      }
    } else if (state === 'blocked') {
      // Stuck: slumps, shakes its head, scratches it.
      const phase = k % 5;
      lean = 0.18;
      squint = 0.75;
      arms = [0.25, 0.1, 0.25, -0.1];
      if (phase < 1.4) look = Math.sin(k * 9) * 0.35;
      else if (phase < 2.6)
        arms = [0.25, 0.1, 0, -2.3 + Math.sin(k * 14) * 0.2];
    } else {
      // Asleep: eyes shut, head on one side, breathing slowly.
      y = 0.05 + Math.sin(k * 1.2) * 0.03;
      tilt = 0.35;
      squint = 0.1;
      wiggle = 0.25;
    }
  }

  b.hammer.visible =
    !b.path && b.bot.state === 'working' && b.bot.tool === 'hammer';
  if (squint > 0.2 && k % 3.7 < 0.12) squint = 0.1;
  P.body.position.y = y;
  P.body.rotation.set(lean, spin, sway);
  P.head.rotation.set(nod, look, tilt);
  P.arms[0].rotation.set(arms[0], 0, arms[1]);
  P.arms[1].rotation.set(arms[2], 0, arms[3]);
  P.antenna.rotation.z = wiggle;
  for (const eye of P.eyes) eye.scale.y = 1.45 * squint;
  return arrived;
}

const pathLength = (points: { x: number; z: number }[]) =>
  points.reduce(
    (n, p, i) =>
      i ? n + Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) : 0,
    0,
  );

/** Turns `o` toward `angle` the short way round. */
const turn = (o: THREE.Object3D, angle: number, k: number) => {
  let d = angle - o.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  o.rotation.y += d * Math.min(1, k);
};

type BotEntity = {
  bot: WorldBot;
  group: THREE.Group;
  light: THREE.MeshStandardMaterial;
  parts: art.Bot;
  label: { obj: CSS2DObject; inner: HTMLDivElement };
  /** Where it stands once it gets there, and which way it looks. */
  target: THREE.Vector3;
  face: number;
  /** Where its owner stands, while it is back with them. */
  owner: { x: number; z: number } | null;
  /** The roads it is travelling, while it travels. */
  path: { x: number; z: number }[] | null;
  travelled: number;
  trail: THREE.Object3D | null;
  seed: number;
  /** In its hand while it hammers. */
  hammer: THREE.Group;
  /** Put up next to its work while it works a big task. */
  crane: { group: THREE.Group; anim: art.Animated } | null;
  /** Points and done points last time, for the +1s. */
  tally: { points: number; done: number };
};

type PersonEntity = {
  key: string;
  townId: string;
  personId: string;
  art: art.Person;
  home: THREE.Vector3;
  goal: THREE.Vector3;
  timer: number;
  phase: number;
  rand: () => number;
  calling: boolean;
};

type Fly = {
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromZoom: number;
  toZoom: number;
  t: number;
};

type Board = ReturnType<typeof art.billboard>;

export const WorldScene = ({
  world,
  selected,
  focus,
  onPick,
}: {
  world: World;
  selected: Pick | null;
  /** Fly the camera here; changes to the object trigger a flight. */
  focus: Pick | 'all' | null;
  onPick: (pick: Pick | null) => void;
}) => {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    controls: MapControls;
    statics: THREE.Group;
    bots: Map<string, BotEntity>;
    people: Map<string, PersonEntity>;
    boards: Map<string, { people: Board; projects: Board }>;
    anims: art.Animated[];
    layout: ReturnType<typeof layoutWorld> | null;
    labels: { obj: CSS2DObject; kind: 'town' | 'project' | 'site' | 'near' }[];
    /** Routes and pings for what is selected. */
    overlay: THREE.Group;
    overlayAnims: art.Animated[];
    fly: Fly | null;
    ring: THREE.Mesh;
    aspect: number;
    placed: boolean;
    /** Each lot's group and where the reward for it pops up. */
    lots: Map<string, { group: THREE.Object3D; top: THREE.Vector3 }>;
    /** Each house's top, for its reward. */
    houses: Map<string, THREE.Vector3>;
    /** Rewards, bounces and +1s playing out. */
    effects: lots.Effect[];
    /** What each lot and house had done last time, to celebrate news. */
    seen: Map<string, string> | null;
  } | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const worldRef = useRef(world);
  worldRef.current = world;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** The zoom that fits `size` world units on screen. */
  const fitZoom = (size: number) => {
    const aspect = state.current?.aspect ?? 1.6;
    return Math.min((VIEW * aspect) / (size * 1.25), VIEW / (size * 0.95));
  };

  /* --------------------------- renderer, once --------------------------- */
  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const css = new CSS2DRenderer();
    css.domElement.style.position = 'absolute';
    css.domElement.style.inset = '0';
    css.domElement.style.pointerEvents = 'none';
    el.appendChild(css.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
    camera.position.setFromSphericalCoords(600, POLAR, AZIMUTH);

    scene.add(new THREE.HemisphereLight('#ffffff', '#c9d1dc', 1.6));
    const sun = new THREE.DirectionalLight('#fffaf0', 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 4;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 700;
    scene.add(sun, sun.target);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000),
      new THREE.MeshStandardMaterial({ color: art.GROUND, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    scene.add(ground);

    const statics = new THREE.Group();
    const overlay = new THREE.Group();
    scene.add(statics, overlay);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.3, 64),
      new THREE.MeshBasicMaterial({
        color: art.INK,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // Like a strategy game: drag to pan, right-drag (or two fingers) to
    // turn, wheel or pinch to zoom toward the pointer.
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minZoom = 0.2;
    controls.maxZoom = 6;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.1;
    controls.zoomToCursor = true;

    state.current = {
      scene,
      camera,
      controls,
      statics,
      bots: new Map(),
      people: new Map(),
      boards: new Map(),
      anims: [],
      layout: null,
      labels: [],
      overlay,
      overlayAnims: [],
      fly: null,
      ring,
      aspect: 1.6,
      placed: false,
      lots: new Map(),
      houses: new Map(),
      effects: [],
      seen: null,
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      css.setSize(w, h);
      const aspect = w / Math.max(h, 1);
      state.current!.aspect = aspect;
      camera.left = (-VIEW * aspect) / 2;
      camera.right = (VIEW * aspect) / 2;
      camera.top = VIEW / 2;
      camera.bottom = -VIEW / 2;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // Click to pick; a drag is not a click.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      for (const hit of ray.intersectObjects(scene.children, true)) {
        let o: THREE.Object3D | null = hit.object;
        while (o && !o.userData.pick) o = o.parent;
        if (o) return onPickRef.current(o.userData.pick as Pick);
      }
      onPickRef.current(null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let shadowSize = 0;
    renderer.setAnimationLoop(() => {
      const s = state.current;
      if (!s) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (s.fly) {
        s.fly.t = Math.min(1, s.fly.t + dt / 0.9);
        const k = 1 - Math.pow(1 - s.fly.t, 3);
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerpVectors(s.fly.fromTarget, s.fly.toTarget, k);
        camera.position.copy(controls.target).add(offset);
        camera.zoom = s.fly.fromZoom + (s.fly.toZoom - s.fly.fromZoom) * k;
        camera.updateProjectionMatrix();
        if (s.fly.t >= 1) s.fly = null;
      }

      for (const a of s.anims) a(t, dt);
      for (const a of s.overlayAnims) a(t, dt);
      s.effects = s.effects.filter((e) => {
        if (e.step(dt)) return true;
        e.group.traverse((o) => {
          if (o instanceof CSS2DObject) o.element.remove();
        });
        e.group.removeFromParent();
        return false;
      });

      // People stroll about their spot, and wave when a bot waits on them.
      for (const p of Array.from(s.people.values())) {
        const g = p.art.group;
        if (p.calling) p.goal.copy(p.home);
        else if ((p.timer -= dt) <= 0) {
          p.timer = 2.5 + p.rand() * 5;
          const a = p.rand() * Math.PI * 2;
          const r = p.rand() * 0.5;
          p.goal.set(p.home.x + Math.cos(a) * r, 0, p.home.z + Math.sin(a) * r);
        }
        const dx = p.goal.x - g.position.x;
        const dz = p.goal.z - g.position.z;
        const dist = Math.hypot(dx, dz);
        const walking = dist > 0.05;
        if (walking) {
          const step = Math.min(dist, dt * 1.2);
          g.position.x += (dx / dist) * step;
          g.position.z += (dz / dist) * step;
          turn(g, Math.atan2(dx, dz), dt * 8);
          p.phase += dt * 9;
        } else turn(g, AZIMUTH, dt * 3);
        const swing = walking ? Math.sin(p.phase) : 0;
        const { legs, arms, body } = p.art;
        legs[0].rotation.x = swing * 0.6;
        legs[1].rotation.x = -swing * 0.6;
        arms[0].rotation.x = -swing * 0.5;
        arms[1].rotation.x = p.calling ? 0 : swing * 0.5;
        arms[1].rotation.z = p.calling ? -2.1 + Math.sin(t * 9) * 0.35 : 0;
        body.position.y = walking
          ? Math.abs(Math.sin(p.phase)) * 0.07
          : Math.sin(t * 2 + p.phase) * 0.015;
        // A little head tilt now and then, and the pet hops along.
        p.art.head.rotation.z = Math.sin(t * 0.7 + p.phase) * 0.08;
        if (p.art.aura) p.art.aura.rotation.y = t * 0.8;
        if (p.art.pet)
          p.art.pet.position.y = walking
            ? Math.abs(Math.sin(p.phase * 0.8)) * 0.14
            : Math.max(0, Math.sin(t * 3 + p.phase)) * 0.04;
      }

      for (const b of Array.from(s.bots.values())) {
        if (act(b, t, dt)) arrive(b);
        if (b.crane) {
          // Up once the bot gets there.
          b.crane.group.visible = !b.path;
          b.crane.anim(t, dt);
        }
      }

      // More detail the closer you are.
      const view = VIEW / camera.zoom;
      for (const l of s.labels)
        l.obj.visible =
          l.kind === 'town'
            ? view > 120
            : l.kind === 'project'
              ? view < 170
              : l.kind === 'site'
                ? view < 70
                : view < 60;
      for (const b of Array.from(s.bots.values()))
        b.label.obj.visible = view < 60;

      // Shadows cover what's on screen.
      const size = Math.min(320, (view * Math.max(s.aspect, 1)) / 2 + 20);
      if (Math.abs(size - shadowSize) > shadowSize * 0.15) {
        shadowSize = size;
        const sc = sun.shadow.camera;
        sc.left = sc.bottom = -size;
        sc.right = sc.top = size;
        sc.updateProjectionMatrix();
      }
      sun.target.position.copy(controls.target);
      sun.position.copy(controls.target).addScaledVector(SUN, 300);

      if (s.ring.visible) s.ring.rotation.z = t * 0.5;
      controls.update();
      renderer.render(scene, camera);
      css.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      el.innerHTML = '';
      state.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- the world ------------------------------ */
  const build = () => {
    const s = state.current;
    if (!s) return;
    const w = worldRef.current;
    const layout = layoutWorld(w);
    s.layout = layout;

    s.statics.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
    });
    s.statics.clear();
    s.labels = [];
    s.anims = [];
    s.boards.clear();
    s.people.clear();
    s.lots.clear();
    s.houses.clear();

    const townRank = new Map(
      [...w.towns]
        .sort((a, b) => b.weekPoints - a.weekPoints)
        .map((t, i) => [t.id, i + 1]),
    );

    // Highways between the towns, with cars.
    for (const [i, r] of layout.roads.entries()) {
      const horizontal = r.x1 !== r.x2;
      const length = Math.abs(horizontal ? r.x2 - r.x1 : r.z2 - r.z1);
      if (length < 1) continue;
      const cx = (r.x1 + r.x2) / 2;
      const cz = (r.z1 + r.z2) / 2;
      const y = -0.58;
      art.strip(
        s.statics,
        horizontal ? length : 4.4,
        horizontal ? 4.4 : length,
        art.ASPHALT,
        cx,
        cz,
        y,
      );
      const from = horizontal ? Math.min(r.x1, r.x2) : Math.min(r.z1, r.z2);
      for (let d = 2; d < length - 1; d += 4)
        art.strip(
          s.statics,
          horizontal ? 1.6 : 0.22,
          horizontal ? 0.22 : 1.6,
          '#ffffff',
          horizontal ? from + d : cx,
          horizontal ? cz : from + d,
          y + 0.01,
        );
      const rand = seeded(`road${i}`);
      for (let k = 0; k < Math.max(1, Math.floor(length / 25)); k++) {
        const car = art.car(
          rand() < 0.5
            ? '#ffffff'
            : art.tint(
                ['#60a5fa', '#f87171', '#fbbf24', '#34d399'][
                  Math.floor(rand() * 4)
                ],
                0.2,
              ),
        );
        s.statics.add(car);
        const dir = k % 2 ? 1 : -1;
        const offset = rand();
        const speed = 3.5 + rand() * 2;
        const lane = dir * 1.05;
        car.rotation.y = horizontal
          ? dir > 0
            ? 0
            : Math.PI
          : dir > 0
            ? -Math.PI / 2
            : Math.PI / 2;
        s.anims.push((t) => {
          let f = (offset + (t * speed) / length) % 1;
          if (dir < 0) f = 1 - f;
          const p = from + f * length;
          if (horizontal) car.position.set(p, y, cz + lane);
          else car.position.set(cx - lane, y, p);
        });
      }
    }

    for (const town of w.towns) buildTown(town, layout, townRank.get(town.id)!);
    for (const p of w.projects) buildProject(p, layout);

    drawBoards();
    syncBots();
    drawOverlay();
    s.controls.minZoom = Math.min(0.5, fitZoom(layout.extent) * 0.6);
    if (!s.placed) {
      s.placed = true;
      frame(
        w.towns.length > 1 ? 'all' : { type: 'town', id: w.towns[0].id },
        false,
      );
    }
  };

  const buildTown = (
    town: WorldTown,
    layout: ReturnType<typeof layoutWorld>,
    rank: number,
  ) => {
    const s = state.current!;
    const w = worldRef.current;
    const spot = layout.towns.get(town.id)!;
    const brand = brandOf(town);
    const accent = brand.primary;
    const rand = seeded(town.id);
    const g = new THREE.Group();
    g.userData.pick = { type: 'town', id: town.id };
    s.statics.add(g);

    // The ground, edged in the company's colour.
    const pad = 3.5;
    const width = spot.maxX - spot.minX + pad * 2;
    const depth = spot.maxZ - spot.minZ + pad * 2;
    const cx = (spot.minX + spot.maxX) / 2;
    const cz = (spot.minZ + spot.maxZ) / 2;
    art.block(g, width + 0.5, 0.3, depth + 0.5, accent, cx, -0.55, cz, 0.12);
    art.block(g, width, 0.6, depth, art.CLAY, cx, -0.6, cz, 0.3);

    // Roads between the squares: the ones between bigger squares are wider
    // and in the company's colour, with a dashed middle line.
    const light = art.tint(accent, 0.62);
    // Under the squares, road everywhere: each square is a rounded block,
    // so every corner curves.
    art.strip(
      g,
      spot.maxX - spot.minX,
      spot.maxZ - spot.minZ,
      light,
      cx,
      cz,
      0.018,
    );
    const roads = [
      ...spot.streetsX.map((r) => ({ ...r, vertical: true })),
      ...spot.streetsZ.map((r) => ({ ...r, vertical: false })),
    ];
    for (const r of roads) {
      const length = r.vertical ? spot.maxZ - spot.minZ : spot.maxX - spot.minX;
      const big = r.width > 4;
      art.strip(
        g,
        r.vertical ? r.width : length,
        r.vertical ? length : r.width,
        big ? accent : light,
        r.vertical ? r.at : cx,
        r.vertical ? cz : r.at,
        big ? 0.026 : 0.022,
      );
      if (!big) continue;
      const from = r.vertical ? spot.minZ : spot.minX;
      for (let d = 2; d < length - 1; d += 4)
        art.strip(
          g,
          r.vertical ? 0.22 : 1.6,
          r.vertical ? 1.6 : 0.22,
          '#ffffff',
          r.vertical ? r.at : from + d,
          r.vertical ? from + d : r.at,
          0.03,
        );
    }

    // Trees round the edge.
    for (const [x0, z0, x1, z1] of [
      [spot.minX - 1.8, spot.minZ - 1.8, spot.maxX + 1.8, spot.minZ - 1.8],
      [spot.minX - 1.8, spot.maxZ + 1.8, spot.maxX + 1.8, spot.maxZ + 1.8],
      [spot.minX - 1.8, spot.minZ - 1.8, spot.minX - 1.8, spot.maxZ + 1.8],
      [spot.maxX + 1.8, spot.minZ - 1.8, spot.maxX + 1.8, spot.maxZ + 1.8],
    ]) {
      const length = Math.hypot(x1 - x0, z1 - z0);
      for (let d = 0; d <= length; d += 3.4) {
        const x = x0 + ((x1 - x0) * d) / length;
        const z = z0 + ((z1 - z0) * d) / length;
        // Leave the highways clear.
        if (Math.abs(x - spot.x) < 4 || Math.abs(z - spot.z) < 4) continue;
        if (rand() < 0.3) continue;
        art.tree(
          g,
          accent,
          x + (rand() - 0.5) * 0.6,
          z + (rand() - 0.5) * 0.6,
          rand,
        );
      }
    }

    // Spare squares are parks.
    for (const cell of spot.cells.filter((c) => c.kind === 'park')) {
      const lawn = lots.plate(BLOCK, BLOCK, 5, art.tint(accent, 0.86), 0.045);
      lawn.position.x = cell.x;
      lawn.position.z = cell.z;
      g.add(lawn);
      for (let i = 0; i < 7; i++)
        art.tree(
          g,
          accent,
          cell.x + (rand() - 0.5) * (BLOCK - 4),
          cell.z + (rand() - 0.5) * (BLOCK - 4),
          rand,
        );
    }

    // The town square: paving, a brand border and the logo in the middle.
    const plaza = new THREE.Group();
    plaza.position.set(spot.plaza.x, 0, spot.plaza.z);
    g.add(plaza);
    const half = spot.plaza.half;
    plaza.add(lots.plate(half * 2, half * 2, 7, accent, 0.027));
    plaza.add(
      lots.plate(half * 2 - 0.9, half * 2 - 0.9, 6.6, '#fbfbfc', 0.031),
    );
    art.groundLogo(plaza, town.name, brand.logo, brand, 3.8);

    const sign = art.logoSign(town.name, brand.logo, brand);
    const flag = art.flagMaterial(town.name, brand.logo, brand);
    const hall = art.townHall(sign, flag, accent);
    hall.group.position.set(-half + HALL_IN, 0, -half + HALL_IN);
    hall.group.rotation.y = AZIMUTH;
    plaza.add(hall.group);
    s.anims.push(...hall.anims);

    // Leaderboards on the square, facing the usual view.
    const people = art.billboard(plaza, 12, 7.5);
    people.group.position.set(-half + 2.2, 0, 8);
    people.group.rotation.y = Math.PI / 2;
    const projects = art.billboard(plaza, 12, 7.5);
    projects.group.position.set(8, 0, -half + 2.2);
    s.boards.set(town.id, { people, projects });

    for (const [x, z] of [
      [half - 1.2, -7],
      [half - 1.2, 7],
      [-7, half - 1.2],
      [7, half - 1.2],
    ])
      s.anims.push(art.flagPole(plaza, flag, x, z, rand() * 6));
    for (const [x, z] of [
      [-half + 2, half - 2],
      [-half + 2, half - 4.6],
      [half - 2, -half + 2],
      [half - 4.6, -half + 2],
    ])
      art.tree(plaza, accent, x, z, rand);

    // Wind turbines out in the fields.
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      if (rand() < 0.45) continue;
      const x = (sx < 0 ? spot.minX : spot.maxX) + sx * (12 + rand() * 4);
      const z = (sz < 0 ? spot.minZ : spot.maxZ) + sz * (12 + rand() * 4);
      s.anims.push(art.turbine(s.statics, x, z, rand() * 6));
      for (let i = 0; i < 3; i++)
        art.tree(
          s.statics,
          '#cbd5e1',
          x + (rand() - 0.5) * 9,
          z + (rand() - 0.5) * 9,
          rand,
        ).position.y = -0.6;
    }

    // Labels: the town's name from afar, its hall up close.
    const label = tag(
      'pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white py-1.5 pl-1.5 pr-4 shadow-xl',
      `${badge(brand.logo, town.name, accent, 40, false)}<div><div class="text-base font-extrabold leading-tight text-neutral-900">${escape(town.name)}</div><div class="text-[11px] font-medium text-neutral-500">🏆 #${rank} · ${Math.round(town.weekPoints)} pts this week</div></div>`,
    );
    label.inner.style.borderBottom = `4px solid ${accent}`;
    label.obj.position.set(cx, 22, cz);
    g.add(label.obj);
    s.labels.push({ obj: label.obj, kind: 'town' });
    const hallLabel = tag(
      'pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-neutral-900 shadow',
      `${badge(brand.logo, town.name, accent, 20)}${escape(town.name)} Town Hall`,
    );
    hallLabel.obj.position.set(-half + HALL_IN, 11, -half + HALL_IN);
    plaza.add(hallLabel.obj);
    s.labels.push({ obj: hallLabel.obj, kind: 'near' });

    // Everyone on their own plot, in the company's colours.
    for (const person of w.people.filter((p) => p.townIds.includes(town.id))) {
      const key = `${town.id}:${person.id}`;
      const at = layout.people.get(key);
      const plot = layout.plots.get(key);
      if (!at || !plot) continue;
      const rim = person.isMe ? '#facc15' : art.tint(accent, 0.5);
      art.strip(g, PLOT, PLOT, rim, plot.x, plot.z, 0.036);
      art.strip(
        g,
        PLOT - 0.5,
        PLOT - 0.5,
        art.tint(person.isMe ? '#facc15' : accent, 0.88),
        plot.x,
        plot.z,
        0.038,
      );
      const figure = art.person(
        person.id,
        brand,
        sign,
        lookOf(person.id, person.look),
      );
      figure.group.position.set(at.x, 0, at.z);
      figure.group.rotation.y = at.angle;
      figure.group.userData.pick = { type: 'person', id: person.id };
      s.statics.add(figure.group);
      if (person.isMe) {
        const mark = new THREE.Mesh(
          new THREE.RingGeometry(0.62, 0.8, 32),
          new THREE.MeshBasicMaterial({ color: '#facc15', depthWrite: false }),
        );
        mark.rotation.x = -Math.PI / 2;
        mark.position.y = 0.06;
        figure.group.add(mark);
      }
      const name = person.isMe ? 'You' : person.name.split(' ')[0];
      const tagged = tag(
        'pointer-events-none flex flex-col items-center',
        `<span class="rounded-full p-[2px] shadow-md" style="background:${person.isMe ? '#facc15' : accent}">${badge(person.avatar, person.name, art.shade(accent, 0.2), 20, true, true)}</span><span class="mt-0.5 whitespace-nowrap rounded-full bg-neutral-900/80 px-1.5 text-[10px] font-semibold text-white">${escape(name)}</span>`,
      );
      tagged.obj.position.set(0, 3.5, 0);
      figure.group.add(tagged.obj);
      s.labels.push({ obj: tagged.obj, kind: 'near' });
      const prand = seeded(key);
      s.people.set(key, {
        key,
        townId: town.id,
        personId: person.id,
        art: figure,
        home: new THREE.Vector3(at.x, 0, at.z),
        goal: new THREE.Vector3(at.x, 0, at.z),
        timer: prand() * 4,
        phase: prand() * 6,
        rand: prand,
        calling: false,
      });
    }
  };

  /**
   * A project: its squares, with its goals' buildings, its record towers
   * and this week's houses.
   */
  const buildProject = (
    project: WorldProject,
    layout: ReturnType<typeof layoutWorld>,
  ) => {
    const s = state.current!;
    const w = worldRef.current;
    const area = layout.projects.get(project.id);
    const town = w.towns.find((t) => t.id === project.townId);
    if (!area || !town) return;
    const accent = brandOf(town).primary;
    const brand = brandOf(project);
    const sign = art.logoSign(project.name, brand.logo, brand);
    const rand = seeded(project.id);
    const g = new THREE.Group();
    g.userData.pick = { type: 'project', id: project.id };
    s.statics.add(g);

    // The project's ground: a rounded block edged in its own colour.
    const width = area.maxX - area.minX;
    const depth = area.maxZ - area.minZ;
    const x = (area.minX + area.maxX) / 2;
    const z = (area.minZ + area.maxZ) / 2;
    const edge = lots.plate(
      width + 0.8,
      depth + 0.8,
      5.4,
      brand.primary,
      0.027,
    );
    const ground = lots.plate(width, depth, 5, '#f4f6f9', 0.031);
    edge.position.set(x, edge.position.y, z);
    ground.position.set(x, ground.position.y, z);
    g.add(edge, ground);
    // Its flag at the front corner.
    s.anims.push(
      art.flagPole(
        g,
        art.flagMaterial(project.name, brand.logo, brand),
        area.maxX - 1.6,
        area.maxZ - 1.6,
        rand() * 6,
      ),
    );

    let tallest = 0;
    project.sites.forEach((site) => {
      const spot = layout.sites.get(site.id);
      if (!spot) return;
      const lot = new THREE.Group();
      lot.position.set(spot.x, 0, spot.z);
      lot.rotation.y = spot.angle;
      lot.userData.pick = { type: 'site', id: site.id };
      g.add(lot);
      lot.add(lots.plate(LOT - 1.2, LOT - 1.2, 1.6, '#fafbfc', 0.034));
      const made =
        site.kind === 'goal'
          ? lots.goalLot(site, accent, sign)
          : site.kind === 'target'
            ? lots.recordTower(site, accent)
            : lots.homesLot(site, accent);
      lot.add(made.group);
      s.anims.push(...made.anims);
      tallest = Math.max(tallest, made.height);
      lot.updateMatrixWorld(true);
      const top =
        'top' in made
          ? new THREE.Vector3(made.top.x, made.top.y, made.top.z)
          : new THREE.Vector3(0, made.height, 0);
      s.lots.set(site.id, {
        group: made.group,
        top: lot.localToWorld(top),
      });
      if ('houses' in made)
        for (const [id, h] of Array.from(made.houses.entries()))
          s.houses.set(
            id,
            lot.localToWorld(new THREE.Vector3(h.x, h.top, h.z)),
          );

      const label = tag(
        'pointer-events-none whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow',
        siteTagHtml(site),
      );
      label.obj.position.set(0, made.height + 1.2, 0);
      lot.add(label.obj);
      s.labels.push({ obj: label.obj, kind: 'site' });
    });

    // Empty lots get a few trees.
    const used = project.sites.length;
    area.cells.forEach((cell, ci) => {
      for (let k = 0; k < LOTS.length; k++) {
        const index = ci * LOTS.length + k;
        if (index < used) continue;
        for (let i = 0; i < 2; i++)
          art.tree(
            g,
            accent,
            cell.x + LOTS[k].dx + (rand() - 0.5) * 5,
            cell.z + LOTS[k].dz + (rand() - 0.5) * 5,
            rand,
          );
      }
    });

    const label = tag(
      'pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-neutral-800 shadow-md',
      `${badge(brand.logo, project.name, brand.primary, 22)}<span class="rounded-full px-1.5 text-[10px] font-bold text-white" style="background:${accent}">#${project.rank}</span>${escape(project.name)}`,
    );
    label.obj.position.set(x, Math.max(tallest, 6) + 3.5, z);
    g.add(label.obj);
    s.labels.push({ obj: label.obj, kind: 'project' });
  };

  /* ---------------------------- leaderboards ---------------------------- */
  const drawBoards = () => {
    const s = state.current;
    if (!s) return;
    const w = worldRef.current;
    for (const town of w.towns) {
      const boards = s.boards.get(town.id);
      if (!boards) continue;
      const brand = brandOf(town);
      const mine = w.projects
        .filter((p) => p.townId === town.id)
        .sort((a, b) => a.rank - b.rank);
      boards.people.draw({
        brand,
        name: town.name,
        logo: brand.logo,
        title: 'Top people',
        subtitle: `${town.name} · this week`,
        rows: town.leaderboard.map((r) => ({
          label: r.name,
          value: r.points,
          hex: brand.primary,
          image: r.avatar,
        })),
        empty: 'No points yet this week',
      });
      boards.projects.draw({
        brand,
        name: town.name,
        logo: brand.logo,
        title: 'Project ranking',
        subtitle: `By ${(mine[0]?.rankedBy ?? 'points this week').toLowerCase()}`,
        rows: mine.map((p) => ({
          label: p.name,
          value: p.weekPoints,
          hex: brandOf(p).primary,
          image: brandOf(p).logo,
          note: `#${p.rank} · ${Math.round(p.weekPoints)} pts`,
        })),
        empty: 'No projects yet',
      });
    }
  };

  /* -------------------------------- bots -------------------------------- */

  /** Where a bot works, on the ground: in front of its building. */
  const workGround = (bot: WorldBot) => {
    const L = state.current!.layout!;
    const site = bot.siteId ? L.sites.get(bot.siteId) : null;
    const house = bot.houseId ? state.current!.houses.get(bot.houseId) : null;
    if (site && house) {
      // Beside its house, facing it.
      const out = new THREE.Vector3(
        house.x - site.x,
        0,
        house.z - site.z,
      ).normalize();
      return {
        x: house.x + out.x * 2.1,
        z: house.z + out.z * 2.1,
        face: Math.atan2(-out.x, -out.z),
      };
    }
    if (site)
      return {
        x: site.x + Math.sin(site.angle) * (LOT / 2 + 1),
        z: site.z + Math.cos(site.angle) * (LOT / 2 + 1),
        // Facing its building.
        face: site.angle + Math.PI,
      };
    const project = bot.projectId ? L.projects.get(bot.projectId) : null;
    if (project) {
      // The middle of its first square, between the four buildings.
      const cell = project.cells[0];
      return { x: cell.x, z: cell.z, face: AZIMUTH };
    }
    const town = L.towns.get(bot.townId)!;
    return { ...town.yard, face: AZIMUTH };
  };

  const ownerHome = (bot: WorldBot) =>
    state.current!.layout!.people.get(`${bot.townId}:${bot.ownerId}`) ?? null;
  const ownerPlot = (bot: WorldBot) =>
    state.current!.layout!.plots.get(`${bot.townId}:${bot.ownerId}`) ?? null;

  /** A bot reached the end of its road. */
  const arrive = (b: BotEntity) => {
    b.path = null;
    if (b.trail) {
      state.current?.scene.remove(b.trail);
      b.trail = null;
    }
    b.light.color.set(BOT_STATE_COLOR[b.bot.state]);
    b.light.emissive.set(BOT_STATE_COLOR[b.bot.state]);
  };

  /** Sends a bot along the roads to its target, glowing blue on the way. */
  const travel = (b: BotEntity, town: TownSpot) => {
    const s = state.current!;
    const from = { x: b.group.position.x, z: b.group.position.z };
    const to = { x: b.target.x, z: b.target.z };
    if (Math.hypot(from.x - to.x, from.z - to.z) < 2) return;
    if (b.trail) s.scene.remove(b.trail);
    b.path = lots.smooth(route(town, from, to));
    b.travelled = 0;
    const line = art.routeLine(b.path, TRANSIT, 0.45);
    b.trail = line.group;
    s.scene.add(line.group);
    b.light.color.set(TRANSIT);
    b.light.emissive.set(TRANSIT);
  };

  /** Words that float up from `parent` and fade: +1, Floor 4, … */
  const floatUp = (
    parent: THREE.Object3D,
    y: number,
    delay: number,
    hex: string,
    text: string,
    big = false,
  ) => {
    const s = state.current;
    if (!s) return;
    const t = tag(
      `pointer-events-none select-none whitespace-nowrap rounded-full font-black shadow-lg ${big ? 'bg-white/95 px-2.5 py-0.5 text-sm' : 'px-2 py-0.5 text-base text-white'}`,
      escape(text),
    );
    Object.assign(
      t.inner.style,
      big ? { color: hex, opacity: '0' } : { background: hex, opacity: '0' },
    );
    const holder = new THREE.Group();
    holder.add(t.obj);
    parent.add(holder);
    const life = big ? 2.4 : 1.6;
    let age = -delay;
    s.effects.push({
      group: holder,
      step: (dt) => {
        age += dt;
        if (age < 0) return true;
        const k = age / life;
        t.obj.position.y = y + k * (big ? 2.5 : 2);
        t.inner.style.opacity = String(
          k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.65) / 0.35),
        );
        t.inner.style.transform = `scale(${k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.8)})`;
        return age < life;
      },
    });
  };
  const plusOne = (
    parent: THREE.Object3D,
    y: number,
    delay: number,
    hex: string,
  ) => floatUp(parent, y, delay, hex, '+1');

  /** A reward over a spot in the world. */
  const pop = (
    kind: 'star' | 'trophy' | 'coin',
    at: THREE.Vector3,
    words?: string,
    hex = '#b45309',
  ) => {
    const s = state.current;
    if (!s) return;
    const e = lots.reward(kind, at);
    s.scene.add(e.group);
    s.effects.push(e);
    if (words) {
      const holder = new THREE.Group();
      holder.position.copy(at);
      s.scene.add(holder);
      floatUp(holder, 2.5, 0.3, hex, words, true);
      // Take the holder away with its words.
      s.effects.push({ group: holder, step: () => holder.children.length > 0 });
    }
  };

  /**
   * Celebrates what got done since last time: a goal building gains a
   * floor (or a new building), a target is reached, a house is finished.
   */
  const celebrate = () => {
    const s = state.current;
    if (!s?.layout) return;
    const w = worldRef.current;
    const next = new Map<string, string>();
    for (const p of w.projects)
      for (const site of p.sites) {
        next.set(site.id, `${site.done}|${site.achieved ? 1 : 0}`);
        for (const h of site.houses ?? [])
          next.set(`h:${h.id}`, h.done ? '1' : '0');
      }
    for (const p of w.people) next.set(`p:${p.id}`, String(p.ownPoints));
    const before = s.seen;
    s.seen = next;
    if (!before) return;
    // A +1 over each person for every line they wrote themselves.
    for (const e of Array.from(s.people.values())) {
      const person = w.people.find((x) => x.id === e.personId);
      const was = before.get(`p:${e.personId}`);
      const gained =
        person && was !== undefined ? person.ownPoints - Number(was) : 0;
      for (let i = 0; i < Math.min(gained, 5); i++)
        plusOne(e.art.group, 3.2, i * 0.35, '#eab308');
    }
    for (const p of w.projects)
      for (const site of p.sites) {
        const lot = s.lots.get(site.id);
        if (!lot) continue;
        if (site.kind === 'homes') {
          for (const h of site.houses ?? []) {
            const at = s.houses.get(h.id);
            if (h.done && before.get(`h:${h.id}`) === '0' && at)
              pop('coin', at, 'Task done!', '#059669');
          }
          continue;
        }
        const was = before.get(site.id);
        if (was === undefined) continue;
        const [done0, reached0] = was.split('|').map(Number);
        if (site.kind === 'target') {
          if (site.achieved && !reached0)
            pop('trophy', lot.top, `🏆 ${site.name}: record!`);
          else if (site.done > done0)
            pop('coin', lot.top, `+${site.done - done0}`);
          else continue;
        } else if (site.done > done0) {
          const floor = site.done % 10 || 10;
          pop(
            'star',
            lot.top,
            floor === 10
              ? '🏢 Building complete!'
              : floor === 1 && site.done > 1
                ? '🏗️ New building!'
                : `⬆ Floor ${floor}`,
          );
        } else continue;
        s.effects.push(lots.bounce(lot.group));
      }
  };

  const syncBots = () => {
    const s = state.current;
    if (!s?.layout) return;
    const w = worldRef.current;
    const layout = s.layout;
    const seen = new Set<string>();

    // Spread bots that share a spot.
    const atSpot = new Map<string, number>();
    const slot = (key: string) => {
      const n = atSpot.get(key) ?? 0;
      atSpot.set(key, n + 1);
      return n;
    };

    for (const bot of w.bots) {
      const town = layout.towns.get(bot.townId);
      const worldTown = w.towns.find((t) => t.id === bot.townId);
      if (!town || !worldTown) continue;
      seen.add(bot.id);
      const accent = brandOf(worldTown).primary;
      const work = workGround(bot);
      const owner = ownerHome(bot);
      const plot = ownerPlot(bot);
      let target: THREE.Vector3;
      let face = work.face;
      const home = goesToOwner(bot.state) && plot && owner ? owner : null;
      if (home && plot) {
        // On their owner's plot, each on its own spot, turned to you so you
        // see it jump and wave.
        const at = plotSpot(plot, slot(`owner:${bot.townId}:${bot.ownerId}`));
        target = new THREE.Vector3(at.x, 0, at.z);
        face = AZIMUTH;
      } else {
        const i = slot(`work:${bot.siteId ?? bot.projectId ?? bot.townId}`);
        const a = i * 1.3;
        target = new THREE.Vector3(
          work.x + Math.cos(a) * i * 1.2,
          0,
          work.z + Math.sin(a) * i * 1.2,
        );
      }

      let entity = s.bots.get(bot.id);
      if (!entity) {
        const brand = brandOf(worldTown);
        const drone = art.bot(
          accent,
          art.logoSign(worldTown.name, brand.logo, brand),
        );
        drone.group.userData.pick = { type: 'bot', id: bot.id };
        drone.group.scale.setScalar(1.25);
        const label = tag(
          'pointer-events-none min-w-[96px] rounded-xl bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow-md',
        );
        label.obj.position.set(0, 2.1, 0);
        drone.group.add(label.obj);
        // New bots set off from their owner, so you see them go to work.
        const start = owner ?? work;
        drone.group.position.set(start.x, 0, start.z);
        s.scene.add(drone.group);
        const tool = lots.hammer();
        tool.position.y = -0.42;
        tool.visible = false;
        drone.arms[1].add(tool);
        entity = {
          bot,
          group: drone.group,
          light: drone.light,
          parts: drone,
          label,
          target,
          face,
          owner: home,
          path: null,
          travelled: 0,
          trail: null,
          seed: (art.hash(bot.id) % 1000) / 100,
          hammer: tool,
          crane: null,
          tally: tallyOf(bot),
        };
        s.bots.set(bot.id, entity);
      }
      // A +1 for every new point, and for every point done.
      const now = tallyOf(bot);
      const gained =
        Math.max(0, now.points - entity.tally.points) +
        Math.max(0, now.done - entity.tally.done);
      entity.tally = now;
      for (let i = 0; i < Math.min(gained, 5); i++)
        plusOne(entity.group, 2.6, i * 0.35, accent);
      // Big tasks get a crane by the work while the bot is on it.
      const wantsCrane =
        bot.state === 'working' && bot.tool === 'crane' && !home;
      if (wantsCrane && !entity.crane) {
        entity.crane = lots.crane(entity.seed);
        s.scene.add(entity.crane.group);
      } else if (!wantsCrane && entity.crane) {
        s.scene.remove(entity.crane.group);
        entity.crane = null;
      }
      if (entity.crane) {
        // Beside the bot, out of the way of the building.
        const side = work.face + Math.PI / 2;
        entity.crane.group.position.set(
          work.x + Math.sin(side) * 3.2,
          0,
          work.z + Math.cos(side) * 3.2,
        );
      }
      const moved =
        entity.target.distanceTo(target) > 2 || entity.bot.state !== bot.state;
      entity.bot = bot;
      entity.target = target;
      entity.face = face;
      entity.owner = home;
      entity.label.inner.innerHTML = botTagHtml(bot, accent, !!home);
      Object.assign(entity.label.inner.style, {
        minWidth: home ? '0' : '',
        padding: home ? '1px 6px' : '',
        borderRadius: home ? '999px' : '',
        boxShadow: home ? `0 0 0 2px ${BOT_STATE_COLOR[bot.state]}` : '',
      });
      if (!entity.path) {
        entity.light.color.set(BOT_STATE_COLOR[bot.state]);
        entity.light.emissive.set(BOT_STATE_COLOR[bot.state]);
      }
      if (moved || !entity.path) travel(entity, town);
    }

    for (const [id, entity] of Array.from(s.bots.entries())) {
      if (seen.has(id)) continue;
      entity.label.obj.element.remove();
      if (entity.trail) s.scene.remove(entity.trail);
      if (entity.crane) s.scene.remove(entity.crane.group);
      s.scene.remove(entity.group);
      s.bots.delete(id);
    }

    // People with a bot waiting on them wave; everyone else strolls.
    for (const p of Array.from(s.people.values()))
      p.calling = w.bots.some(
        (b) =>
          b.ownerId === p.personId &&
          b.townId === p.townId &&
          b.state === 'waiting',
      );
  };

  /* ------------------------ routes and directions ----------------------- */

  /**
   * For a person: blue routes from them to all their bots' work at once,
   * with pings where each works. For a project, task building or bot: the
   * way there from you.
   */
  const drawOverlay = () => {
    const s = state.current;
    if (!s?.layout) return;
    const L = s.layout;
    const w = worldRef.current;
    s.overlay.clear();
    s.overlayAnims = [];
    const sel = selectedRef.current;
    if (!sel) return;
    const add = (made: { group: THREE.Object3D; anim: art.Animated }) => {
      s.overlay.add(made.group);
      s.overlayAnims.push(made.anim);
    };

    if (sel.type === 'person') {
      for (const bot of w.bots.filter((b) => b.ownerId === sel.id)) {
        const town = L.towns.get(bot.townId);
        const home = ownerHome(bot);
        if (!town || !home) continue;
        const work = workGround(bot);
        add(art.routeLine(route(town, home, work), TRANSIT, 0.6));
        add(art.ripple(work.x, work.z, TRANSIT, 3.2));
      }
      return;
    }

    // Directions: from you (or the town square) to what you picked.
    let to: { x: number; z: number } | null = null;
    let townId: string | null = null;
    if (sel.type === 'project') {
      const area = L.projects.get(sel.id);
      const project = w.projects.find((p) => p.id === sel.id);
      if (area && project) {
        to = { x: area.cells[0].x, z: area.cells[0].z };
        townId = project.townId;
      }
    } else if (sel.type === 'site') {
      const spot = L.sites.get(sel.id);
      const project = w.projects.find((p) => p.id === spot?.projectId);
      if (spot && project) {
        to = {
          x: spot.x + Math.sin(spot.angle) * (LOT / 2 + 1),
          z: spot.z + Math.cos(spot.angle) * (LOT / 2 + 1),
        };
        townId = project.townId;
      }
    } else if (sel.type === 'bot') {
      const bot = w.bots.find((b) => b.id === sel.id);
      if (bot) {
        to = workGround(bot);
        townId = bot.townId;
      }
    }
    if (!to || !townId) return;
    const town = L.towns.get(townId)!;
    const me = w.people.find((p) => p.isMe);
    const from = (me && L.people.get(`${townId}:${me.id}`)) ?? town.plaza;
    add(art.routeLine(route(town, from, to), TRANSIT, 0.6));
    add(art.ripple(to.x, to.z, TRANSIT, 3.2));
  };

  /* ------------------------------ camera -------------------------------- */
  const frame = (to: Pick | 'all', animate = true) => {
    const s = state.current;
    if (!s?.layout) return;
    const L = s.layout;
    let target: THREE.Vector3;
    let size: number;
    if (to === 'all') {
      target = new THREE.Vector3(0, 0, 0);
      size = L.extent * 1.05;
    } else if (to.type === 'town') {
      const t = L.towns.get(to.id);
      if (!t) return;
      target = new THREE.Vector3(
        (t.minX + t.maxX) / 2,
        0,
        (t.minZ + t.maxZ) / 2,
      );
      size = Math.max(t.maxX - t.minX, t.maxZ - t.minZ) + 10;
    } else if (to.type === 'project') {
      const p = L.projects.get(to.id);
      if (!p) return;
      target = new THREE.Vector3(p.x, 3, p.z);
      size = Math.max(p.maxX - p.minX, p.maxZ - p.minZ) + 16;
    } else if (to.type === 'site') {
      const p = L.sites.get(to.id);
      if (!p) return;
      target = new THREE.Vector3(p.x, 3, p.z);
      size = 22;
    } else if (to.type === 'bot') {
      const b = s.bots.get(to.id);
      if (!b) return;
      target = b.target.clone().setY(2);
      size = 22;
    } else {
      const p = Array.from(s.people.values()).find((x) => x.personId === to.id);
      if (!p) return;
      // Them and everywhere their bots are working.
      const spots = [
        p.home,
        ...worldRef.current.bots
          .filter((b) => b.ownerId === to.id && b.townId === p.townId)
          .map(workGround),
      ];
      const xs = spots.map((v) => v.x);
      const zs = spots.map((v) => v.z);
      target = new THREE.Vector3(
        (Math.min(...xs) + Math.max(...xs)) / 2,
        1.5,
        (Math.min(...zs) + Math.max(...zs)) / 2,
      );
      size = Math.max(
        20,
        Math.max(...xs) - Math.min(...xs) + 16,
        Math.max(...zs) - Math.min(...zs) + 16,
      );
    }
    const zoom = Math.max(
      s.controls.minZoom,
      Math.min(s.controls.maxZoom, fitZoom(size)),
    );
    if (!animate) {
      const offset = s.camera.position.clone().sub(s.controls.target);
      s.controls.target.copy(target);
      s.camera.position.copy(target).add(offset);
      s.camera.zoom = zoom;
      s.camera.updateProjectionMatrix();
      return;
    }
    s.fly = {
      fromTarget: s.controls.target.clone(),
      toTarget: target,
      fromZoom: s.camera.zoom,
      toZoom: zoom,
      t: 0,
    };
  };

  // Rebuild when the shape of the world changes; otherwise move bots and
  // repaint the boards.
  const shape = JSON.stringify([
    world.towns.map((t) => [t.id, t.name, t.brand, t.weekPoints]),
    world.projects.map((p) => [
      p.id,
      p.name,
      p.rank,
      p.brand,
      p.sites.map((x) => [
        x.id,
        x.name,
        x.color,
        x.done,
        x.missed,
        x.achieved,
        x.percent,
        x.records,
        x.houses?.map((h) => [h.id, h.done]),
      ]),
    ]),
    world.people.map((p) => [p.id, p.name, p.avatar, p.townIds, p.look]),
  ]);
  useEffect(() => {
    if (state.current) build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);
  useEffect(() => {
    syncBots();
    drawBoards();
    drawOverlay();
    celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    if (focus) frame(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // A ring under whatever is selected, and its routes.
  useEffect(() => {
    const s = state.current;
    if (!s?.layout) return;
    const L = s.layout;
    let at: { x: number; z: number; r: number } | null = null;
    if (selected?.type === 'site') {
      const b = L.sites.get(selected.id);
      if (b) at = { x: b.x, z: b.z, r: 4.6 };
    } else if (selected?.type === 'person') {
      const p = Array.from(s.people.values()).find(
        (x) => x.personId === selected.id,
      );
      if (p) at = { x: p.home.x, z: p.home.z, r: 1.3 };
    }
    s.ring.visible = !!at;
    if (at) {
      s.ring.position.set(at.x, 0.08, at.z);
      s.ring.geometry.dispose();
      s.ring.geometry = new THREE.RingGeometry(at.r, at.r + 0.3, 64);
    }
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, shape]);

  return (
    <div ref={mount} className="relative isolate size-full overflow-hidden" />
  );
};
