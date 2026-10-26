'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { World, WorldBot } from '@/lib/world/state';
import { BOT_STATE_COLOR, goesToOwner, STATUS_EMOJI } from '@/lib/world/state';

import { layoutWorld, seeded } from './layout';

/*
 * The world in plain three.js (no React renderer, whose JSX types clash with
 * MUI's). Companies are islands with a town on them, projects are buildings
 * around the town's plaza, people stand on the plaza and their bots work at
 * the buildings. A bot that is done or needs permission flies back to its
 * owner. Models: Kenney (CC0), see public/world/CREDITS.md.
 */

export type Pick = { type: 'town' | 'building' | 'person' | 'bot'; id: string };

const MODELS = {
  buildings: [
    '/world/city/building-small-a.glb',
    '/world/city/building-small-b.glb',
    '/world/city/building-small-c.glb',
    '/world/city/building-small-d.glb',
    '/world/city/building-garage.glb',
  ],
  trees: ['/world/props/tree.glb'],
  fountain: '/world/city/pavement-fountain.glb',
  statue: '/world/props/statue.glb',
  trophy: '/world/props/trophy.glb',
  person: '/world/people/character-soldier.glb',
  bot: '/world/bots/enemy-flying.glb',
};

const SKY = '#cfe9ff';
const WATER = '#7cc4e4';
const GRASS = '#9fd67a';
const SAND = '#ecdcae';
const PLAZA = '#efe6d2';

const hash = (s: string) =>
  Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

/** Scales a model so its footprint is `size` wide and stands it on y = 0. */
function fit(
  object: THREE.Object3D,
  size: number,
  by: 'width' | 'height' = 'width',
) {
  const box = new THREE.Box3().setFromObject(object);
  const dims = box.getSize(new THREE.Vector3());
  const current = by === 'width' ? Math.max(dims.x, dims.z) : dims.y;
  object.scale.multiplyScalar(size / (current || 1));
  const after = new THREE.Box3().setFromObject(object);
  object.position.y -= after.min.y;
  return object;
}

const shadows = (o: THREE.Object3D) =>
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

const tag = (className: string, html = '') => {
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = className;
  inner.innerHTML = html;
  outer.appendChild(inner);
  const obj = new CSS2DObject(outer);
  return { obj, inner };
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const botTagHtml = (bot: WorldBot) => {
  const pct = bot.progress.total
    ? Math.round((bot.progress.done / bot.progress.total) * 100)
    : 0;
  const emoji =
    bot.state === 'waiting'
      ? '❓'
      : bot.state === 'blocked'
        ? STATUS_EMOJI.blocked
        : bot.state === 'done'
          ? STATUS_EMOJI.done
          : bot.state === 'working'
            ? STATUS_EMOJI.doing
            : '💤';
  return `<div class="flex items-center gap-1 whitespace-nowrap"><span>${emoji}</span><span class="font-semibold">${escape(bot.ownerName)}</span><span class="text-neutral-500">${bot.progress.done}/${bot.progress.total}</span></div><div class="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-neutral-200"><div class="h-full rounded-full" style="width:${pct}%;background:${BOT_STATE_COLOR[bot.state]}"></div></div>`;
};

type BotEntity = {
  bot: WorldBot;
  group: THREE.Group;
  label: { obj: CSS2DObject; inner: HTMLDivElement };
  target: THREE.Vector3;
  seed: number;
};

type PersonEntity = {
  key: string;
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Record<string, THREE.AnimationAction>;
  playing: string;
};

type Fly = {
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromCam: THREE.Vector3;
  toCam: THREE.Vector3;
  t: number;
};

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
    camera: THREE.PerspectiveCamera;
    controls: MapControls;
    statics: THREE.Group;
    models: Record<string, GLTF>;
    bots: Map<string, BotEntity>;
    people: Map<string, PersonEntity>;
    layout: ReturnType<typeof layoutWorld> | null;
    labels: { obj: CSS2DObject; kind: 'town' | 'building' | 'near' }[];
    fly: Fly | null;
    ring: THREE.Mesh;
    ready: boolean;
    placed: boolean;
  } | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const worldRef = useRef(world);
  worldRef.current = world;

  /* --------------------------- renderer, once --------------------------- */
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const css = new CSS2DRenderer();
    css.domElement.style.position = 'absolute';
    css.domElement.style.inset = '0';
    css.domElement.style.pointerEvents = 'none';
    el.appendChild(css.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 160, 420);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1200);
    camera.position.set(60, 70, 80);

    scene.add(new THREE.HemisphereLight('#ffffff', '#8fb87a', 1.2));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -120;
    sc.right = sc.top = 120;
    sc.far = 300;
    scene.add(sun, sun.target);

    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(900, 64),
      new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.6 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.6;
    sea.receiveShadow = true;
    scene.add(sea);

    const statics = new THREE.Group();
    scene.add(statics);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.25, 48),
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.9,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // Age of Empires style: drag to pan, right-drag (or two fingers) to
    // turn, wheel or pinch to zoom.
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 12;
    controls.maxDistance = 320;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.15;
    controls.zoomToCursor = true;

    state.current = {
      scene,
      camera,
      controls,
      statics,
      models: {},
      bots: new Map(),
      people: new Map(),
      layout: null,
      labels: [],
      fly: null,
      ring,
      ready: false,
      placed: false,
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      css.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // Load every model once, then build.
    const loader = new GLTFLoader();
    const urls = Array.from(
      new Set([
        ...MODELS.buildings,
        ...MODELS.trees,
        MODELS.fountain,
        MODELS.statue,
        MODELS.trophy,
        MODELS.person,
        MODELS.bot,
      ]),
    );
    Promise.all(
      urls.map((u) => loader.loadAsync(u).then((g) => [u, g] as const)),
    )
      .then((loaded) => {
        if (disposed || !state.current) return;
        state.current.models = Object.fromEntries(loaded);
        state.current.ready = true;
        build();
      })
      .catch((err) => console.error('World models failed to load', err));

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
      const hits = ray.intersectObjects(scene.children, true);
      for (const hit of hits) {
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
    renderer.setAnimationLoop(() => {
      const s = state.current;
      if (!s) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (s.fly) {
        s.fly.t = Math.min(1, s.fly.t + dt / 0.9);
        const k = 1 - Math.pow(1 - s.fly.t, 3);
        controls.target.lerpVectors(s.fly.fromTarget, s.fly.toTarget, k);
        camera.position.lerpVectors(s.fly.fromCam, s.fly.toCam, k);
        if (s.fly.t >= 1) s.fly = null;
      }

      for (const p of Array.from(s.people.values())) p.mixer?.update(dt);

      for (const b of Array.from(s.bots.values())) {
        const g = b.group;
        // Fly toward where the bot should be, then hover there.
        tmp.copy(b.target);
        if (b.bot.state === 'working') {
          tmp.x += Math.cos(t * 0.8 + b.seed) * 1.2;
          tmp.z += Math.sin(t * 0.8 + b.seed) * 1.2;
        }
        const speed = 1 - Math.pow(0.02, dt);
        g.position.x += (tmp.x - g.position.x) * speed;
        g.position.z += (tmp.z - g.position.z) * speed;
        const bob =
          b.bot.state === 'blocked'
            ? Math.sin(t * 14 + b.seed) * 0.05
            : Math.sin(t * 2.4 + b.seed) * 0.25;
        g.position.y += (tmp.y + bob - g.position.y) * speed;
        const dx = tmp.x - g.position.x;
        const dz = tmp.z - g.position.z;
        if (Math.hypot(dx, dz) > 0.2) g.rotation.y = Math.atan2(dx, dz);
      }

      // Show detail as you zoom in.
      const zoom = camera.position.distanceTo(controls.target);
      for (const l of s.labels) {
        const show =
          l.kind === 'town'
            ? zoom > 80
            : l.kind === 'building'
              ? zoom < 140
              : zoom < 80;
        l.obj.visible = show;
      }
      for (const b of Array.from(s.bots.values()))
        b.label.obj.visible = zoom < 80;

      if (s.ring.visible) s.ring.rotation.z = t * 0.5;
      controls.update();
      renderer.render(scene, camera);
      css.render(scene, camera);
    });

    return () => {
      disposed = true;
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
    if (!s?.ready) return;
    const w = worldRef.current;
    const layout = layoutWorld(w);
    s.layout = layout;
    const model = (url: string) => s.models[url].scene.clone(true);

    // Rebuild the static world.
    s.statics.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
    });
    s.statics.clear();
    s.labels = [];
    for (const p of Array.from(s.people.values())) p.mixer?.stopAllAction();
    s.people.clear();

    for (const town of w.towns) {
      const spot = layout.towns.get(town.id)!;
      const g = new THREE.Group();
      g.position.set(spot.x, 0, spot.z);
      g.userData.pick = { type: 'town', id: town.id };
      s.statics.add(g);

      // The island: grass on a sandy shore.
      const shore = new THREE.Mesh(
        new THREE.CylinderGeometry(spot.radius + 1.5, spot.radius + 3, 1.2, 64),
        new THREE.MeshStandardMaterial({ color: SAND, roughness: 1 }),
      );
      shore.position.y = -0.75;
      shore.receiveShadow = true;
      const grass = new THREE.Mesh(
        new THREE.CylinderGeometry(spot.radius, spot.radius + 0.6, 0.4, 64),
        new THREE.MeshStandardMaterial({ color: GRASS, roughness: 1 }),
      );
      grass.position.y = -0.2;
      grass.receiveShadow = true;
      const plaza = new THREE.Mesh(
        new THREE.CircleGeometry(7.5, 48),
        new THREE.MeshStandardMaterial({ color: PLAZA, roughness: 1 }),
      );
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.y = 0.01;
      plaza.receiveShadow = true;
      g.add(shore, grass, plaza);

      // Paths from the plaza to each ring.
      const path = new THREE.MeshStandardMaterial({
        color: PLAZA,
        roughness: 1,
      });
      const rings = new Set(
        w.buildings
          .filter((b) => b.townId === town.id)
          .map((b) =>
            Math.round(
              Math.hypot(
                layout.buildings.get(b.id)!.x - spot.x,
                layout.buildings.get(b.id)!.z - spot.z,
              ),
            ),
          ),
      );
      for (const r of Array.from(rings)) {
        const road = new THREE.Mesh(
          new THREE.RingGeometry(r - 4.2, r - 3, 96),
          path,
        );
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.012;
        road.receiveShadow = true;
        g.add(road);
      }

      // Town hall: a fountain with the company's banner.
      const fountain = fit(model(MODELS.fountain), 6);
      shadows(fountain);
      g.add(fountain);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 6, 8),
        new THREE.MeshStandardMaterial({ color: '#6b5b4a' }),
      );
      pole.position.set(0, 3, -3.6);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.2),
        new THREE.MeshStandardMaterial({
          color: town.color || '#6366f1',
          side: THREE.DoubleSide,
        }),
      );
      flag.position.set(1, 5.3, -3.6);
      g.add(pole, flag);

      const name = tag(
        'pointer-events-none whitespace-nowrap rounded-2xl bg-white/90 px-4 py-2 text-lg font-bold text-neutral-900 shadow-lg',
        escape(town.name),
      );
      name.obj.position.set(0, 9, 0);
      g.add(name.obj);
      s.labels.push({ obj: name.obj, kind: 'town' });
      const small = tag(
        'pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 shadow',
        `🏛️ ${escape(town.name)}`,
      );
      small.obj.position.set(0, 7, 0);
      g.add(small.obj);
      s.labels.push({ obj: small.obj, kind: 'near' });

      // Trees around the edge, clear of buildings.
      const rand = seeded(town.id);
      const taken = w.buildings
        .filter((b) => b.townId === town.id)
        .map((b) => layout.buildings.get(b.id)!);
      for (let i = 0; i < 18 + spot.radius; i++) {
        const angle = rand() * Math.PI * 2;
        const r = spot.radius - 1.5 - rand() * 4;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        if (
          taken.some((b) => Math.hypot(b.x - spot.x - x, b.z - spot.z - z) < 5)
        )
          continue;
        const tree = fit(
          model(MODELS.trees[Math.floor(rand() * MODELS.trees.length)]),
          3 + rand() * 2.5,
          'height',
        );
        tree.position.x = x;
        tree.position.z = z;
        tree.rotation.y = rand() * Math.PI * 2;
        shadows(tree);
        g.add(tree);
      }
    }

    // Buildings: one per project, the best ranked biggest and nearest.
    for (const b of w.buildings) {
      const spot = layout.buildings.get(b.id)!;
      const g = new THREE.Group();
      g.position.set(spot.x, 0, spot.z);
      g.rotation.y = spot.angle;
      g.userData.pick = { type: 'building', id: b.id };
      const size = b.rank === 1 ? 6.5 : b.rank <= 3 ? 5.5 : 4.6;
      const house = fit(
        model(MODELS.buildings[hash(b.id) % MODELS.buildings.length]),
        size,
      );
      shadows(house);
      g.add(house);
      const height = new THREE.Box3().setFromObject(house).max.y;
      // A flag in the project's colour on the roof.
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: '#57534e' }),
      );
      pole.position.set(0, height + 0.8, 0);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.6),
        new THREE.MeshStandardMaterial({
          color: b.color || '#f59e0b',
          side: THREE.DoubleSide,
        }),
      );
      flag.position.set(0.5, height + 1.3, 0);
      g.add(pole, flag);
      if (b.rank === 1 && b.weekPoints > 0) {
        const trophy = fit(model(MODELS.trophy), 0.9);
        trophy.position.set(-1, height, 0);
        g.add(trophy);
      }
      const label = tag(
        'pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow',
        `<span class="mr-1 rounded-full bg-neutral-900 px-1.5 text-[10px] text-white">#${b.rank}</span>${escape(b.name)}`,
      );
      label.obj.position.set(0, height + 2.6, 0);
      g.add(label.obj);
      s.labels.push({ obj: label.obj, kind: 'building' });
      s.statics.add(g);
    }

    // People on the plaza of every town they belong to.
    const personGltf = s.models[MODELS.person];
    for (const person of w.people) {
      for (const townId of person.townIds) {
        const key = `${townId}:${person.id}`;
        const spot = layout.people.get(key);
        if (!spot) continue;
        const g = new THREE.Group();
        g.position.set(spot.x, 0, spot.z);
        g.userData.pick = { type: 'person', id: person.id };
        const body = fit(cloneSkinned(personGltf.scene), 2.8, 'height');
        body.rotation.y = spot.angle + Math.PI;
        shadows(body);
        g.add(body);
        if (person.isMe) {
          const mark = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 32),
            new THREE.MeshBasicMaterial({
              color: '#facc15',
              transparent: true,
              opacity: 0.7,
            }),
          );
          mark.rotation.x = -Math.PI / 2;
          mark.position.y = 0.02;
          g.add(mark);
        }
        const label = tag(
          `pointer-events-none whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow ${person.isMe ? 'bg-yellow-300 text-neutral-900' : 'bg-neutral-900/80 text-white'}`,
          escape(person.isMe ? 'You' : person.name),
        );
        label.obj.position.set(0, 3.4, 0);
        g.add(label.obj);
        s.labels.push({ obj: label.obj, kind: 'near' });
        s.statics.add(g);

        const mixer = new THREE.AnimationMixer(body);
        const actions: Record<string, THREE.AnimationAction> = {};
        for (const clip of personGltf.animations)
          actions[clip.name] = mixer.clipAction(clip);
        const entity: PersonEntity = {
          key,
          group: g,
          mixer,
          actions,
          playing: '',
        };
        s.people.set(key, entity);
      }
    }

    syncBots();
    if (!s.placed) {
      s.placed = true;
      frame('all', false);
    }
  };

  /* -------------------------------- bots -------------------------------- */
  const syncBots = () => {
    const s = state.current;
    if (!s?.ready || !s.layout) return;
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
      seen.add(bot.id);
      const town = layout.towns.get(bot.townId);
      if (!town) continue;
      const building = bot.projectId
        ? layout.buildings.get(bot.projectId)
        : null;
      const workSpot = building
        ? new THREE.Vector3(
            building.x + (town.x - building.x) * 0.3,
            3.4,
            building.z + (town.z - building.z) * 0.3,
          )
        : new THREE.Vector3(town.x + 2.5, 3.4, town.z + 2.5);
      const owner = layout.people.get(`${bot.townId}:${bot.ownerId}`);
      let target = workSpot;
      if (goesToOwner(bot.state) && owner) {
        const i = slot(`owner:${bot.townId}:${bot.ownerId}`);
        const a = i * 1.1 + 0.6;
        target = new THREE.Vector3(
          owner.x + Math.cos(a) * 2.2,
          3 + i * 0.35,
          owner.z + Math.sin(a) * 2.2,
        );
      } else {
        const i = slot(`work:${bot.projectId ?? bot.townId}`);
        const a = i * 1.3;
        target = workSpot
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(a) * i * 0.9,
              i * 0.15,
              Math.sin(a) * i * 0.9,
            ),
          );
      }

      let entity = s.bots.get(bot.id);
      if (!entity) {
        const g = new THREE.Group();
        g.userData.pick = { type: 'bot', id: bot.id };
        const drone = fit(s.models[MODELS.bot].scene.clone(true), 1.8);
        drone.position.y = 0;
        shadows(drone);
        g.add(drone);
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshBasicMaterial({ color: BOT_STATE_COLOR[bot.state] }),
        );
        light.name = 'light';
        light.position.y = 1.7;
        g.add(light);
        const label = tag(
          'pointer-events-none min-w-[84px] rounded-lg bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow',
        );
        label.obj.position.set(0, 2.8, 0);
        g.add(label.obj);
        // New bots start at their work, so finished ones are seen flying home.
        g.position.copy(workSpot);
        s.scene.add(g);
        entity = {
          bot,
          group: g,
          label,
          target,
          seed: (hash(bot.id) % 1000) / 100,
        };
        s.bots.set(bot.id, entity);
      }
      entity.bot = bot;
      entity.target = target;
      entity.label.inner.innerHTML = botTagHtml(bot);
      const light = entity.group.getObjectByName('light') as THREE.Mesh;
      (light.material as THREE.MeshBasicMaterial).color.set(
        BOT_STATE_COLOR[bot.state],
      );
    }

    for (const [id, entity] of Array.from(s.bots.entries())) {
      if (seen.has(id)) continue;
      entity.label.obj.element.remove();
      s.scene.remove(entity.group);
      s.bots.delete(id);
    }

    // People with a bot waiting on them reach out; everyone else idles.
    for (const p of Array.from(s.people.values())) {
      const [townId, personId] = p.key.split(':');
      const calling = w.bots.some(
        (b) =>
          b.ownerId === personId &&
          b.townId === townId &&
          b.state === 'waiting',
      );
      const want =
        calling && p.actions['interact-right'] ? 'interact-right' : 'idle';
      if (p.playing !== want && p.actions[want]) {
        p.actions[p.playing]?.fadeOut(0.3);
        p.actions[want].reset().fadeIn(0.3).play();
        p.playing = want;
      }
    }
  };

  /* ------------------------------ camera -------------------------------- */
  const frame = (to: Pick | 'all', animate = true) => {
    const s = state.current;
    if (!s?.layout) return;
    const L = s.layout;
    let target: THREE.Vector3;
    let distance: number;
    if (to === 'all') {
      const span = Math.max(L.cols, L.rows) * L.spacing;
      target = new THREE.Vector3(0, 0, 0);
      distance = Math.max(80, span * 1.25);
    } else if (to.type === 'town') {
      const t = L.towns.get(to.id);
      if (!t) return;
      target = new THREE.Vector3(t.x, 0, t.z);
      distance = t.radius * 2.6;
    } else if (to.type === 'building') {
      const b = L.buildings.get(to.id);
      if (!b) return;
      target = new THREE.Vector3(b.x, 1, b.z);
      distance = 36;
    } else if (to.type === 'bot') {
      const b = s.bots.get(to.id);
      if (!b) return;
      target = b.target.clone().setY(1);
      distance = 30;
    } else {
      const p = Array.from(s.people.values()).find((x) =>
        x.key.endsWith(`:${to.id}`),
      );
      if (!p) return;
      target = p.group.position.clone().setY(1);
      distance = 30;
    }
    // Keep the current heading, look down at a pleasant angle.
    const dir = s.camera.position
      .clone()
      .sub(s.controls.target)
      .setY(0)
      .normalize();
    if (!dir.lengthSq()) dir.set(0.6, 0, 0.8);
    const cam = target
      .clone()
      .add(dir.multiplyScalar(distance * 0.62))
      .add(new THREE.Vector3(0, distance * 0.78, 0));
    if (!animate) {
      s.controls.target.copy(target);
      s.camera.position.copy(cam);
      return;
    }
    s.fly = {
      fromTarget: s.controls.target.clone(),
      toTarget: target,
      fromCam: s.camera.position.clone(),
      toCam: cam,
      t: 0,
    };
  };

  // Rebuild when the shape of the world changes; otherwise just move bots.
  const shape = JSON.stringify([
    world.towns.map((t) => [t.id, t.name, t.color]),
    world.buildings.map((b) => [
      b.id,
      b.name,
      b.rank,
      b.color,
      b.weekPoints > 0,
    ]),
    world.people.map((p) => [p.id, p.townIds]),
  ]);
  useEffect(() => {
    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);
  useEffect(() => {
    syncBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.bots]);

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
      if (b) at = { x: b.x, z: b.z, r: 4.2 };
    } else if (selected?.type === 'town') {
      const t = L.towns.get(selected.id);
      if (t) at = { x: t.x, z: t.z, r: 8 };
    } else if (selected?.type === 'person') {
      const p = Array.from(s.people.values()).find((x) =>
        x.key.endsWith(`:${selected.id}`),
      );
      if (p) at = { x: p.group.position.x, z: p.group.position.z, r: 1.2 };
    }
    s.ring.visible = !!at;
    if (at) {
      s.ring.position.set(at.x, 0.05, at.z);
      s.ring.scale.setScalar(at.r);
    }
  }, [selected, shape]);

  return <div ref={mount} className="relative size-full overflow-hidden" />;
};
