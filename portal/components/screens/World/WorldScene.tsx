'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import type {
  World,
  WorldBot,
  WorldBrand,
  WorldBuilding,
  WorldTown,
} from '@/lib/world/state';
import { BOT_STATE_COLOR, goesToOwner, STATUS_EMOJI } from '@/lib/world/state';

import * as art from './art';
import { layoutWorld, LOT, PLAZA, ROAD, seeded } from './layout';

/*
 * The world in plain three.js (no React renderer, whose JSX types clash with
 * MUI's), seen from above at an angle like a strategy game. Companies are
 * towns in their brand colours, joined by highways; projects are buildings
 * around the town square, where the town hall and the leaderboards stand
 * and the people wait for their bots. A bot that is done or needs
 * permission flies back to its owner. Everything is drawn from simple
 * shapes in art.ts, so there are no models to download.
 */

export type Pick = { type: 'town' | 'building' | 'person' | 'bot'; id: string };

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

const botTagHtml = (bot: WorldBot, hex: string) => {
  const pct = bot.progress.total
    ? Math.round((bot.progress.done / bot.progress.total) * 100)
    : 0;
  return `<div class="flex items-center gap-1 whitespace-nowrap">${badge(bot.ownerAvatar ?? null, bot.ownerName, hex, 18, true, true)}<span>${botEmoji(bot)}</span><span class="font-semibold">${escape(bot.ownerName)}</span><span class="text-neutral-500">${bot.progress.done}/${bot.progress.total}</span></div><div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200"><div class="h-full rounded-full" style="width:${pct}%;background:${BOT_STATE_COLOR[bot.state]}"></div></div>`;
};

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
  rotors: THREE.Object3D[];
  label: { obj: CSS2DObject; inner: HTMLDivElement };
  target: THREE.Vector3;
  seed: number;
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
    labels: { obj: CSS2DObject; kind: 'town' | 'building' | 'near' }[];
    fly: Fly | null;
    ring: THREE.Mesh;
    aspect: number;
    placed: boolean;
  } | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const worldRef = useRef(world);
  worldRef.current = world;

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
    scene.add(statics);

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
      fly: null,
      ring,
      aspect: 1.6,
      placed: false,
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

      // People stroll about their spot, and wave when a bot waits on them.
      for (const p of Array.from(s.people.values())) {
        const g = p.art.group;
        if (p.calling) p.goal.copy(p.home);
        else if ((p.timer -= dt) <= 0) {
          p.timer = 2.5 + p.rand() * 5;
          const a = p.rand() * Math.PI * 2;
          const r = p.rand() * 1.1;
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
        arms[1].rotation.z = p.calling ? -2.7 + Math.sin(t * 9) * 0.35 : 0;
        body.position.y = walking
          ? Math.abs(Math.sin(p.phase)) * 0.07
          : Math.sin(t * 2 + p.phase) * 0.015;
      }

      for (const b of Array.from(s.bots.values())) {
        const g = b.group;
        // Fly toward where the bot should be, then hover there.
        tmp.copy(b.target);
        if (b.bot.state === 'working') {
          tmp.x += Math.cos(t * 0.8 + b.seed) * 1.4;
          tmp.z += Math.sin(t * 0.8 + b.seed) * 1.4;
        }
        const speed = 1 - Math.pow(0.03, dt);
        g.position.x += (tmp.x - g.position.x) * speed;
        g.position.z += (tmp.z - g.position.z) * speed;
        const bob =
          b.bot.state === 'blocked'
            ? Math.sin(t * 14 + b.seed) * 0.05
            : Math.sin(t * 2.4 + b.seed) * 0.25;
        g.position.y += (tmp.y + bob - g.position.y) * speed;
        const dx = tmp.x - g.position.x;
        const dz = tmp.z - g.position.z;
        if (Math.hypot(dx, dz) > 0.2) turn(g, Math.atan2(dx, dz), dt * 6);
        g.rotation.z = -dx * 0.04;
        const spin = b.bot.state === 'asleep' ? 4 : 30;
        for (const r of b.rotors) r.rotation.y += dt * spin;
      }

      // More detail the closer you are.
      const view = VIEW / camera.zoom;
      for (const l of s.labels)
        l.obj.visible =
          l.kind === 'town'
            ? view > 105
            : l.kind === 'building'
              ? view < 150
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

  /* ------------------------- towns and buildings ------------------------ */
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

    const townRank = new Map(
      [...w.towns]
        .sort((a, b) => b.weekPoints - a.weekPoints)
        .map((t, i) => [t.id, i + 1]),
    );

    // Highways between the towns, with cars.
    for (const [i, r] of layout.roads.entries()) {
      const along = r.x1 !== r.x2;
      const length = Math.abs(along ? r.x2 - r.x1 : r.z2 - r.z1);
      if (length < 1) continue;
      const cx = (r.x1 + r.x2) / 2;
      const cz = (r.z1 + r.z2) / 2;
      const y = -0.58;
      art.strip(
        s.statics,
        along ? length : 4.4,
        along ? 4.4 : length,
        art.ASPHALT,
        cx,
        cz,
        y,
      );
      for (let d = 2; d < length - 1; d += 4) {
        const at = (along ? Math.min(r.x1, r.x2) : Math.min(r.z1, r.z2)) + d;
        art.strip(
          s.statics,
          along ? 1.6 : 0.22,
          along ? 0.22 : 1.6,
          '#ffffff',
          along ? at : cx,
          along ? cz : at,
          y + 0.01,
        );
      }
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
        car.position.y = y;
        s.statics.add(car);
        const dir = k % 2 ? 1 : -1;
        const offset = rand();
        const speed = 3.5 + rand() * 2;
        const lane = dir * 1.05;
        car.rotation.y = along
          ? dir > 0
            ? 0
            : Math.PI
          : dir > 0
            ? -Math.PI / 2
            : Math.PI / 2;
        s.anims.push((t) => {
          let f = (offset + (t * speed) / length) % 1;
          if (dir < 0) f = 1 - f;
          const p =
            (along ? Math.min(r.x1, r.x2) : Math.min(r.z1, r.z2)) + f * length;
          if (along) car.position.set(p, y, cz + lane);
          else car.position.set(cx - lane, y, p);
        });
      }
    }

    for (const town of w.towns) buildTown(town, layout, townRank.get(town.id)!);
    for (const b of w.buildings) buildBuilding(b, layout);

    drawBoards();
    syncBots();
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
    const half = spot.half;
    const rand = seeded(town.id);
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    g.userData.pick = { type: 'town', id: town.id };
    s.statics.add(g);

    // The block, edged in the company's colour.
    art.block(
      g,
      half * 2 + 0.5,
      0.3,
      half * 2 + 0.5,
      accent,
      0,
      -0.55,
      0,
      0.12,
    );
    art.block(g, half * 2, 0.6, half * 2, art.CLAY, 0, -0.6, 0, 0.3);

    // Roads: rings around the square and the lots, and two cross roads.
    const road = art.tint(accent, 0.62);
    for (const r of spot.rings) {
      art.strip(g, r * 2 + ROAD, ROAD, road, 0, r, 0.025);
      art.strip(g, r * 2 + ROAD, ROAD, road, 0, -r, 0.025);
      art.strip(g, ROAD, r * 2 + ROAD, road, r, 0, 0.025);
      art.strip(g, ROAD, r * 2 + ROAD, road, -r, 0, 0.025);
    }
    const crossLength = half - PLAZA;
    const crossMid = PLAZA + crossLength / 2;
    for (const [x, z, horizontal] of [
      [crossMid, 0, true],
      [-crossMid, 0, true],
      [0, crossMid, false],
      [0, -crossMid, false],
    ] as const) {
      art.strip(
        g,
        horizontal ? crossLength : ROAD,
        horizontal ? ROAD : crossLength,
        accent,
        x,
        z,
        0.028,
      );
      // White arrows pointing out of town.
      for (let d = PLAZA + 3.5; d < half - 1; d += 5) {
        const sign = (horizontal ? x : z) > 0 ? 1 : -1;
        const arrow = new THREE.Mesh(
          new THREE.ShapeGeometry(
            new THREE.Shape([
              new THREE.Vector2(-0.6, -0.5),
              new THREE.Vector2(0, 0.5),
              new THREE.Vector2(0.6, -0.5),
              new THREE.Vector2(0.3, -0.5),
              new THREE.Vector2(0, 0),
              new THREE.Vector2(-0.3, -0.5),
            ]),
          ),
          art.clay('#ffffff', { rough: 1 }),
        );
        arrow.rotation.x = -Math.PI / 2;
        arrow.rotation.z = horizontal
          ? -sign * (Math.PI / 2)
          : sign > 0
            ? Math.PI
            : 0;
        arrow.position.set(
          horizontal ? sign * d : 0,
          0.035,
          horizontal ? 0 : sign * d,
        );
        g.add(arrow);
      }
    }

    // The square: paving, a brand border and the logo in the middle.
    art.strip(g, PLAZA * 2, PLAZA * 2, '#fbfbfc', 0, 0, 0.018);
    const edge = PLAZA - 0.5;
    art.strip(g, PLAZA * 2 - 1, 0.35, accent, 0, edge, 0.03);
    art.strip(g, PLAZA * 2 - 1, 0.35, accent, 0, -edge, 0.03);
    art.strip(g, 0.35, PLAZA * 2 - 1, accent, edge, 0, 0.03);
    art.strip(g, 0.35, PLAZA * 2 - 1, accent, -edge, 0, 0.03);
    art.groundLogo(g, town.name, brand.logo, brand, 3.6);

    const sign = art.logoSign(town.name, brand.logo, brand);
    const flag = art.flagMaterial(town.name, brand.logo, brand);
    const hall = art.townHall(sign, flag, accent);
    hall.group.position.set(-9, 0, -9);
    hall.group.rotation.y = AZIMUTH;
    g.add(hall.group);
    s.anims.push(...hall.anims);

    // Leaderboards on the square, facing the usual view.
    const people = art.billboard(g, 10, 6.25);
    people.group.position.set(-PLAZA + 1.8, 0, 4.6);
    people.group.rotation.y = Math.PI / 2;
    const projects = art.billboard(g, 10, 6.25);
    projects.group.position.set(4.6, 0, -PLAZA + 1.8);
    s.boards.set(town.id, { people, projects });

    for (const [x, z] of [
      [2.4, PLAZA - 0.8],
      [-2.4, PLAZA - 0.8],
      [PLAZA - 0.8, 2.4],
      [PLAZA - 0.8, -2.4],
    ])
      s.anims.push(art.flagPole(g, flag, x, z, rand() * 6));
    for (const [x, z] of [
      [-PLAZA + 1.4, PLAZA - 1.4],
      [PLAZA - 1.4, -PLAZA + 1.4],
      [-PLAZA + 1.4, PLAZA - 3.6],
      [PLAZA - 3.6, -PLAZA + 1.4],
    ])
      art.tree(g, accent, x, z, rand);

    // Trees round the edge, clear of the cross roads.
    const margin = half - 1.9;
    for (let d = -margin; d <= margin; d += 3.2)
      for (const [x, z] of [
        [d, margin],
        [d, -margin],
        [margin, d],
        [-margin, d],
      ]) {
        if (Math.abs(z) < 3.5 || Math.abs(x) < 3.5) continue;
        if (rand() < 0.3) continue;
        art.tree(g, accent, x + (rand() - 0.5), z + (rand() - 0.5), rand);
      }

    // Empty lots are little parks.
    for (const park of spot.parks) {
      art.strip(
        s.statics,
        LOT - 1,
        LOT - 1,
        art.tint(accent, 0.86),
        park.x,
        park.z,
        0.015,
      );
      for (let i = 0; i < 4; i++)
        art.tree(
          s.statics,
          accent,
          park.x + (rand() - 0.5) * 6,
          park.z + (rand() - 0.5) * 6,
          rand,
        );
    }

    // Wind turbines out in the fields.
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      if (rand() < 0.45) continue;
      const x = spot.x + sx * (half + 8 + rand() * 4);
      const z = spot.z + sz * (half + 8 + rand() * 4);
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
    label.obj.position.set(0, 16, 0);
    g.add(label.obj);
    s.labels.push({ obj: label.obj, kind: 'town' });
    const hallLabel = tag(
      'pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-neutral-900 shadow',
      `${badge(brand.logo, town.name, accent, 20)}${escape(town.name)} Town Hall`,
    );
    hallLabel.obj.position.set(-9, 11, -9);
    g.add(hallLabel.obj);
    s.labels.push({ obj: hallLabel.obj, kind: 'near' });

    // People on the square, in the company's colours.
    const here = w.people.filter((p) => p.townIds.includes(town.id));
    for (const person of here) {
      const key = `${town.id}:${person.id}`;
      const at = layout.people.get(key);
      if (!at) continue;
      const figure = art.person(person.id, brand, sign);
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
        mark.position.y = 0.05;
        figure.group.add(mark);
      }
      const name = person.isMe ? 'You' : person.name.split(' ')[0];
      const label = tag(
        'pointer-events-none flex flex-col items-center',
        `<span class="rounded-full p-[2px] shadow-md" style="background:${person.isMe ? '#facc15' : accent}">${badge(person.avatar, person.name, art.shade(accent, 0.2), 20, true, true)}</span><span class="mt-0.5 whitespace-nowrap rounded-full bg-neutral-900/80 px-1.5 text-[10px] font-semibold text-white">${escape(name)}</span>`,
      );
      label.obj.position.set(0, 3.5, 0);
      figure.group.add(label.obj);
      s.labels.push({ obj: label.obj, kind: 'near' });
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

  const buildBuilding = (
    b: WorldBuilding,
    layout: ReturnType<typeof layoutWorld>,
  ) => {
    const s = state.current!;
    const w = worldRef.current;
    const spot = layout.buildings.get(b.id);
    const town = w.towns.find((t) => t.id === b.townId);
    if (!spot || !town) return;
    const townBrand = brandOf(town);
    const brand = brandOf(b);
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    g.rotation.y = spot.angle;
    g.userData.pick = { type: 'building', id: b.id };
    s.statics.add(g);
    art.strip(g, LOT - 1, LOT - 1, '#eef0f4', 0, 0, 0.015);
    const height =
      b.rank === 1 ? 13 : b.rank <= 3 ? 10 : 7 + (art.hash(b.id) % 3);
    const kind = art.buildingKind(b.id, b.rank);
    const made = art.building(
      kind,
      height,
      townBrand.primary,
      art.logoSign(b.name, brand.logo, brand),
      (art.hash(b.id) % 100) / 10,
    );
    g.add(made.group);
    s.anims.push(...made.anims);
    const top = new THREE.Box3().setFromObject(made.group).max.y;
    if (b.rank === 1 && b.weekPoints > 0) {
      const gold = art.clay('#f5b301', { metal: 0.5, rough: 0.35 });
      const cup = new THREE.Group();
      cup.position.set(-1.4, kind === 'tower' ? height + 1.65 : top, 1.2);
      g.add(cup);
      art.mesh(
        cup,
        new THREE.CylinderGeometry(0.15, 0.3, 0.25, 16),
        gold,
        0,
        0.12,
        0,
      );
      art.mesh(
        cup,
        new THREE.CylinderGeometry(0.07, 0.07, 0.35, 10),
        gold,
        0,
        0.4,
        0,
      );
      art.mesh(
        cup,
        new THREE.CylinderGeometry(0.5, 0.18, 0.6, 20),
        gold,
        0,
        0.85,
        0,
      );
      s.anims.push((t) => (cup.rotation.y = t * 0.8));
    }
    const label = tag(
      'pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-neutral-800 shadow-md',
      `${badge(brand.logo, b.name, brand.primary, 22)}<span class="rounded-full px-1.5 text-[10px] font-bold text-white" style="background:${townBrand.primary}">#${b.rank}</span>${escape(b.name)}`,
    );
    label.obj.position.set(0, top + 2.4, 0);
    g.add(label.obj);
    s.labels.push({ obj: label.obj, kind: 'building' });
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
      const mine = w.buildings
        .filter((b) => b.townId === town.id)
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
        rows: mine.map((b) => ({
          label: b.name,
          value: b.weekPoints,
          hex: brandOf(b).primary,
          image: brandOf(b).logo,
          note: `#${b.rank} · ${Math.round(b.weekPoints)} pts`,
        })),
        empty: 'No projects yet',
      });
    }
  };

  /* -------------------------------- bots -------------------------------- */
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
      const building = bot.projectId
        ? layout.buildings.get(bot.projectId)
        : null;
      // Bots work over the road in front of their building.
      const workSpot = building
        ? new THREE.Vector3(
            building.x + Math.sin(building.angle) * (LOT / 2 + 0.8),
            5,
            building.z + Math.cos(building.angle) * (LOT / 2 + 0.8),
          )
        : new THREE.Vector3(town.x - 3, 5, town.z + 3);
      const owner = layout.people.get(`${bot.townId}:${bot.ownerId}`);
      let target: THREE.Vector3;
      if (goesToOwner(bot.state) && owner) {
        const i = slot(`owner:${bot.townId}:${bot.ownerId}`);
        // Behind and above them, so they stay in sight.
        const a = -AZIMUTH * 3 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.8;
        target = new THREE.Vector3(
          owner.x + Math.cos(a) * 1.9,
          4 + i * 0.3,
          owner.z + Math.sin(a) * 1.9,
        );
      } else {
        const i = slot(`work:${bot.projectId ?? bot.townId}`);
        const a = i * 1.3;
        target = workSpot
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(a) * i * 1.1,
              i * 0.3,
              Math.sin(a) * i * 1.1,
            ),
          );
      }

      let entity = s.bots.get(bot.id);
      if (!entity) {
        const drone = art.bot(accent);
        drone.group.userData.pick = { type: 'bot', id: bot.id };
        const label = tag(
          'pointer-events-none min-w-[96px] rounded-xl bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow-md',
        );
        label.obj.position.set(0, 1.9, 0);
        drone.group.add(label.obj);
        // New bots start at their work, so finished ones are seen flying home.
        drone.group.position.copy(workSpot);
        s.scene.add(drone.group);
        entity = {
          bot,
          group: drone.group,
          light: drone.light,
          rotors: drone.rotors,
          label,
          target,
          seed: (art.hash(bot.id) % 1000) / 100,
        };
        s.bots.set(bot.id, entity);
      }
      entity.bot = bot;
      entity.target = target;
      entity.label.inner.innerHTML = botTagHtml(bot, accent);
      entity.light.color.set(BOT_STATE_COLOR[bot.state]);
      entity.light.emissive.set(BOT_STATE_COLOR[bot.state]);
    }

    for (const [id, entity] of Array.from(s.bots.entries())) {
      if (seen.has(id)) continue;
      entity.label.obj.element.remove();
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
      target = new THREE.Vector3(t.x, 0, t.z);
      size = t.half * 2 + 6;
    } else if (to.type === 'building') {
      const b = L.buildings.get(to.id);
      if (!b) return;
      target = new THREE.Vector3(b.x, 3, b.z);
      size = 26;
    } else if (to.type === 'bot') {
      const b = s.bots.get(to.id);
      if (!b) return;
      target = b.target.clone().setY(2);
      size = 20;
    } else {
      const p = Array.from(s.people.values()).find((x) => x.personId === to.id);
      if (!p) return;
      target = p.home.clone().setY(1.5);
      size = 18;
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
    world.buildings.map((b) => [
      b.id,
      b.name,
      b.rank,
      b.brand,
      b.weekPoints > 0,
    ]),
    world.people.map((p) => [p.id, p.name, p.avatar, p.townIds]),
  ]);
  useEffect(() => {
    if (state.current) build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);
  useEffect(() => {
    syncBots();
    drawBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useEffect(() => {
    if (focus) frame(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // A ring under whatever is selected.
  useEffect(() => {
    const s = state.current;
    if (!s?.layout) return;
    const L = s.layout;
    let at: { x: number; z: number; r: number } | null = null;
    if (selected?.type === 'building') {
      const b = L.buildings.get(selected.id);
      if (b) at = { x: b.x, z: b.z, r: 5.6 };
    } else if (selected?.type === 'person') {
      const p = Array.from(s.people.values()).find(
        (x) => x.personId === selected.id,
      );
      if (p) at = { x: p.home.x, z: p.home.z, r: 1.3 };
    }
    s.ring.visible = !!at;
    if (at) {
      s.ring.position.set(at.x, 0.06, at.z);
      s.ring.geometry.dispose();
      s.ring.geometry = new THREE.RingGeometry(at.r, at.r + 0.3, 64);
    }
  }, [selected, shape]);

  return <div ref={mount} className="relative size-full overflow-hidden" />;
};
